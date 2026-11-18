import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertGeneratedChapters,
  convertGeneratedVolumes,
  mergeOrReplaceMasterPlot,
  parseGenerateVolumeChaptersResponse,
  parseGenerateVolumesResponse,
  parseLivingPlotRealignResponse,
  parseMasterPlotImportJson,
  parseSeedToBibleResponse,
  serializeMasterPlotJson,
} from './plotArchitectEngine';

test('plotArchitectEngine parses Seed-to-Bible, Volumes, Chapter Skeletons, and Living Realign', () => {
  const seed = parseSeedToBibleResponse(
    `<think>brainstorm</think>\n{"suggestedTitle":"Thanh Đồng Cổ Kính","blocks":[{"title":"Tiền đề","content":"Tu tiên nghịch mệnh"}],"plotThreads":[{"title":"Thân thế","description":"Bí ẩn","introducedChapter":"Chương 1"}]}`
  );
  assert.equal(seed.suggestedTitle, 'Thanh Đồng Cổ Kính');
  assert.equal(seed.blocks.length, 1);
  assert.equal(seed.plotThreads.length, 1);

  const seedWithoutTitle = parseSeedToBibleResponse(
    `{"blocks":[{"title":"A","content":"B"}],"plotThreads":[]}`
  );
  assert.equal(seedWithoutTitle.suggestedTitle, undefined);

  const vols = parseGenerateVolumesResponse(
    `{"volumes":[{"title":"Quyển 1: Khởi Đầu","arcGoal":"Trúc Cơ","keyAntagonists":"Triệu Phong","turningPointsAndClimax":"Đại hội tông môn"}]}`
  );
  const acts = convertGeneratedVolumes(vols);
  assert.equal(acts.length, 1);
  assert.equal(acts[0].blueprint.arcGoal, 'Trúc Cơ');

  const chapsRaw = parseGenerateVolumeChaptersResponse(
    `{"chapters":[{"title":"Chương 1: Nhập Môn","chapterGoal":"Vượt khảo hạch","starterBeats":"- Nhịp 1: Kiểm tra linh căn"}]}`
  );
  const chaps = convertGeneratedChapters(chapsRaw);
  assert.equal(chaps.length, 1);
  assert.equal(chaps[0].chapterGoal, 'Vượt khảo hạch');

  const realign = parseLivingPlotRealignResponse(
    `{"analysis":"Mạch truyện đổi hướng","volumeUpdates":[{"actId":"act_1","arcGoal":"Mục tiêu mới"}],"chapterGoalUpdates":[{"chapterId":"c_2","chapterGoal":"Mục tiêu chương mới"}]}`
  );
  assert.equal(realign.volumeUpdates[0].blueprint.arcGoal, 'Mục tiêu mới');
  assert.equal(realign.chapterGoalUpdates[0].chapterGoal, 'Mục tiêu chương mới');
});

test('Master Plot JSON round-trip and Merge vs Replace conflict resolution', () => {
  const existingBlocks = [
    {
      id: 'b1',
      title: 'Tiền đề',
      content: 'Cũ',
      includeInArchitect: true,
      includeInProse: false,
    },
  ];
  const existingThreads = [
    {
      id: 't1',
      title: 'Ngọc bội',
      description: 'Cũ',
      introducedChapter: 'Chương 1',
      status: 'Open' as const,
    },
  ];

  const json = serializeMasterPlotJson(
    [
      ...existingBlocks,
      {
        id: 'b2',
        title: 'Thế lực mới',
        content: 'Huyết Sát Minh',
        includeInArchitect: true,
        includeInProse: true,
      },
    ],
    existingThreads
  );

  const imported = parseMasterPlotImportJson(json);
  const merged = mergeOrReplaceMasterPlot(
    existingBlocks,
    existingThreads,
    imported.masterPlotBlocks,
    imported.plotThreads,
    'merge'
  );
  assert.equal(merged.masterPlotBlocks.length, 2);
  assert.equal(merged.addedBlocks, 1);
  assert.equal(merged.plotThreads.length, 1);

  const replaced = mergeOrReplaceMasterPlot(
    existingBlocks,
    existingThreads,
    imported.masterPlotBlocks,
    imported.plotThreads,
    'replace'
  );
  assert.equal(replaced.masterPlotBlocks.length, 2);
});
