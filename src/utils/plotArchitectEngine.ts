import {
  DEFAULT_VOLUME_BLUEPRINT,
  ManuscriptAct,
  ManuscriptChapter,
  MasterPlotBlock,
  PlotThread,
  PlotThreadStatus,
  ProtagonistProfile,
  StorySummary,
  VolumeBlueprint,
} from '../types/novel';
import { createAct, createChapter } from './manuscriptEngine';
import { splitThinkingAndContent } from './thinkingOrchestrator';

export function createStarterMasterPlotBlocks(
  variant: 'xianxia' | 'general' = 'xianxia'
): MasterPlotBlock[] {
  if (variant === 'general') {
    return [
      {
        id: 'mp_premise',
        title: 'Tiền đề & Chủ đề cốt lõi',
        content: '',
        includeInArchitect: true,
        includeInProse: false,
      },
      {
        id: 'mp_world_roadmap',
        title: 'Lộ trình phát triển & Bản đồ thế giới',
        content: '',
        includeInArchitect: true,
        includeInProse: false,
      },
      {
        id: 'mp_factions',
        title: 'Thế lực & Mâu thuẫn chính',
        content: '',
        includeInArchitect: true,
        includeInProse: false,
      },
      {
        id: 'mp_stages',
        title: 'Đại cương các giai đoạn',
        content: '',
        includeInArchitect: true,
        includeInProse: false,
      },
    ];
  }

  return [
    {
      id: 'mp_premise',
      title: 'Tiền đề & Chủ đề cốt lõi',
      content:
        'Thiếu niên ngoại môn Lâm Huyền tư chất bình thường nhưng tâm trí trầm ổn, vô tình sở hữu mảnh Ngọc Bội Thanh Đồng có khả năng thanh lọc linh khí tạp chất. Từ thân phận thấp bé tại Thanh Vân Tông, từng bước phá giải bí mật thượng cổ và tranh đoạt cơ duyên trường sinh.',
      includeInArchitect: true,
      includeInProse: false,
    },
    {
      id: 'mp_world_roadmap',
      title: 'Lộ trình tu luyện & Bản đồ thế giới',
      content:
        'Cảnh giới: Luyện Khí (1-9 tầng) -> Trúc Cơ -> Kim Đan -> Nguyên Anh -> Hóa Thần.\nBản đồ: Đông Hoang (Thanh Vân Tông trên Vân Vụ Sơn) -> Trung Châu Cổ Thành -> Hư Hải Bí Cảnh.',
      includeInArchitect: true,
      includeInProse: false,
    },
    {
      id: 'mp_factions',
      title: 'Thế lực & Mâu thuẫn chính',
      content:
        '- Nội bộ Thanh Vân Tông: Chấp sự Triệu Phong & phe trưởng lão chèn ép đệ tử ngoại môn, tranh đoạt linh thạch và danh ngạch vào bí cảnh.\n- Bên ngoài: Huyết Sát Minh âm thầm thu thập các mảnh tàn trận Thanh Đồng thượng cổ.',
      includeInArchitect: true,
      includeInProse: false,
    },
    {
      id: 'mp_stages',
      title: 'Đại cương các giai đoạn',
      content:
        'Quyển 1: Ngoại Môn Phong Ba (ẩn nhẫn tu luyện, vạch trần Triệu Phong, đạt Trúc Cơ).\nQuyển 2: Bí Cảnh Cổ Tông (rời sơn môn tìm mảnh ngọc thứ hai, đối đầu Huyết Sát Minh).',
      includeInArchitect: true,
      includeInProse: false,
    },
  ];
}

function cleanStr(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

function extractJsonText(raw: string): string {
  const { content } = splitThinkingAndContent(raw);
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (
    (cleaned.startsWith('{') && cleaned.endsWith('}')) ||
    (cleaned.startsWith('[') && cleaned.endsWith(']'))
  ) {
    return cleaned;
  }

  const firstObj = cleaned.indexOf('{');
  const firstArr = cleaned.indexOf('[');
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    const lastArr = cleaned.lastIndexOf(']');
    if (lastArr > firstArr) return cleaned.slice(firstArr, lastArr + 1);
  }
  if (firstObj !== -1) {
    const lastObj = cleaned.lastIndexOf('}');
    if (lastObj > firstObj) return cleaned.slice(firstObj, lastObj + 1);
  }
  return cleaned;
}

function parseJsonSafe(raw: string, contextLabel: string): unknown {
  const jsonText = extractJsonText(raw);
  if (!jsonText.trim()) {
    throw new Error(
      `Model không trả về dữ liệu JSON cho ${contextLabel} (có thể đã dùng hết token để suy luận Thinking). Hãy thử lại hoặc tăng Max Tokens.`
    );
  }
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error(
      `Dữ liệu JSON ${contextLabel} chưa hoàn chỉnh hoặc sai cú pháp (có thể phản hồi bị cắt ngắn). Hãy thử lại.`
    );
  }
}

function formatMasterPlotSummary(blocks: MasterPlotBlock[], threads: PlotThread[]): string {
  const blockText = blocks
    .filter((b) => b.includeInArchitect && b.content.trim())
    .map((b) => `### ${b.title}\n${b.content.trim()}`)
    .join('\n\n');

  const threadText = threads
    .filter((t) => t.status === 'Open' && t.title.trim())
    .map((t) => `- ${t.title} (${t.introducedChapter || 'Chưa rõ'}): ${t.description}`)
    .join('\n');

  return [
    blockText ? `=== MASTER PLOT BLOCKS ===\n${blockText}` : '',
    threadText ? `=== OPEN PLOT THREADS ===\n${threadText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

// 1. Expand Single Master Plot Block
export function buildExpandPlotBlockPrompt(params: {
  projectTitle: string;
  targetBlock: MasterPlotBlock;
  otherBlocks: MasterPlotBlock[];
  protagonist: ProtagonistProfile;
}): { system: string; user: string } {
  const system = [
    'Bạn là Kiến trúc sư Cốt truyện (Story Architect) chuyên nghiệp.',
    'Nhiệm vụ: Mở rộng và làm sắc nét một khối Cốt truyện chính (Master Plot Block) sao cho có chiều sâu, xung đột rõ ràng, nhất quán với các khối cốt truyện còn lại.',
    'Yêu cầu: Chỉ xuất trực tiếp nội dung văn bản đã mở rộng cho khối này (dùng gạch đầu dòng hoặc đoạn súc tích), KHÔNG lặp tiêu đề khối và KHÔNG thêm lời chào hỏi.',
  ].join('\n');

  const others = params.otherBlocks
    .filter((b) => b.id !== params.targetBlock.id && b.content.trim())
    .map((b) => `- ${b.title}: ${b.content.trim()}`)
    .join('\n');

  const user = [
    `Tác phẩm: ${params.projectTitle || 'Untitled Novel'}`,
    params.protagonist.name.trim()
      ? `Nhân vật chính: ${params.protagonist.name} (${params.protagonist.realm || 'Chưa rõ'}) — ${params.protagonist.personality}`
      : '',
    others ? `=== CÁC KHỐI CỐT TRUYỆN KHÁC ===\n${others}` : '',
    `=== KHỐI CẦN MỞ RỘNG: ${params.targetBlock.title} ===\n${params.targetBlock.content.trim() || '(Đang trống — hãy khởi tạo nội dung chi tiết cho khối này)'}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}

// 2. Seed-to-Bible Generator
export function buildSeedToBiblePrompt(params: {
  projectTitle: string;
  premiseIdea: string;
  genre: string;
  protagonist: ProtagonistProfile;
}): { system: string; user: string } {
  const system = [
    'Bạn là Kiến trúc sư Cốt truyện chuyên nghiệp. Từ ý tưởng khởi đầu ngắn gọn của tác giả, hãy kiến tạo bộ Khung Cốt truyện Chính (Master Plot Bible) và 3–4 Tuyến truyện/Phục bút khởi đầu.',
    'Yêu cầu súc tích: Mỗi khối `content` viết cô đọng, giàu xung đột (3–5 câu hoặc gạch đầu dòng ngắn gọn) để đảm bảo JSON trọn vẹn.',
    'BẮT BUỘC CHỈ trả về duy nhất 1 đối tượng JSON hợp lệ theo mẫu:',
    '{',
    '  "suggestedTitle": "Tên tác phẩm ngắn gọn, gợi cảm hứng",',
    '  "blocks": [',
    '    { "title": "Tiền đề & Chủ đề cốt lõi", "content": "..." },',
    '    { "title": "Lộ trình tu luyện & Bản đồ thế giới", "content": "..." },',
    '    { "title": "Thế lực & Mâu thuẫn chính", "content": "..." },',
    '    { "title": "Đại cương các giai đoạn", "content": "..." }',
    '  ],',
    '  "plotThreads": [',
    '    { "title": "Tên phục bút/tuyến truyện", "description": "Mô tả bí ẩn hoặc xung đột cần giải quyết", "introducedChapter": "Chương 1" }',
    '  ]',
    '}',
  ].join('\n');

  const user = [
    `Tác phẩm: ${params.projectTitle || 'Untitled Novel'}`,
    `Thể loại / Phong cách: ${params.genre.trim() || 'Tiên hiệp / Huyền huyễn'}`,
    params.protagonist.name.trim()
      ? `Nhân vật chính hiện có: ${params.protagonist.name} (${params.protagonist.realm || 'Chưa rõ'})`
      : '',
    `Ý tưởng / Tiền đề của tác giả:\n${params.premiseIdea.trim()}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}

export interface GeneratedSeedBibleResult {
  suggestedTitle?: string;
  blocks: MasterPlotBlock[];
  plotThreads: PlotThread[];
}

export function parseSeedToBibleResponse(raw: string): GeneratedSeedBibleResult {
  const parsed = parseJsonSafe(raw, 'Seed-to-Bible') as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Dữ liệu Seed-to-Bible không phải đối tượng JSON hợp lệ.');
  }

  const now = Date.now();
  const rawBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
  const blocks: MasterPlotBlock[] = rawBlocks
    .filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object'))
    .map((b, idx) => ({
      id: `mp_gen_${now}_${idx}`,
      title: cleanStr(b.title) || `Khối cốt truyện ${idx + 1}`,
      content: cleanStr(b.content),
      includeInArchitect: true,
      includeInProse: false,
    }))
    .filter((b) => b.content.length > 0 || b.title.length > 0);

  const rawThreads = Array.isArray(parsed.plotThreads) ? parsed.plotThreads : [];
  const plotThreads: PlotThread[] = rawThreads
    .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
    .map((t, idx) => ({
      id: `pt_gen_${now}_${idx}`,
      title: cleanStr(t.title),
      description: cleanStr(t.description),
      introducedChapter: cleanStr(t.introducedChapter) || 'Chương 1',
      status: 'Open' as PlotThreadStatus,
    }))
    .filter((t) => t.title.length > 0);

  if (blocks.length === 0) {
    throw new Error('Model không trả về khối cốt truyện nào hợp lệ.');
  }

  const suggestedTitle = cleanStr(parsed.suggestedTitle || parsed.title);
  return {
    ...(suggestedTitle ? { suggestedTitle } : {}),
    blocks,
    plotThreads,
  };
}

// 3. Auto-Populate Volumes (Chia Quyển)
export function buildGenerateVolumesPrompt(params: {
  projectTitle: string;
  masterPlotBlocks: MasterPlotBlock[];
  plotThreads: PlotThread[];
  existingActs: ManuscriptAct[];
  desiredCount?: number;
}): { system: string; user: string } {
  const count = params.desiredCount ?? 3;
  const system = [
    `Bạn là Kiến trúc sư Cốt truyện. Dựa trên Master Plot, hãy chia nhỏ hành trình thành ${count} Quyển (Volumes/Arcs) mạch lạc, có cao trào và bước ngoặt tăng tiến.`,
    'BẮT BUỘC CHỈ trả về 1 đối tượng JSON hợp lệ:',
    '{',
    '  "volumes": [',
    '    {',
    '      "title": "Quyển X: Tên Quyển",',
    '      "arcGoal": "Mục tiêu chính của quyển này",',
    '      "keyAntagonists": "Thế lực & đối thủ chính trong quyển",',
    '      "turningPointsAndClimax": "Các nút thắt quan trọng và trận cao trào cuối quyển"',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  const existingSummary = params.existingActs
    .map((a, idx) => `${idx + 1}. ${a.title} (${a.chapters.length} chương) — ${a.blueprint?.arcGoal || 'Chưa có mục tiêu'}`)
    .join('\n');

  const user = [
    `Tác phẩm: ${params.projectTitle || 'Untitled Novel'}`,
    formatMasterPlotSummary(params.masterPlotBlocks, params.plotThreads),
    existingSummary ? `=== CÁC QUYỂN HIỆN CÓ TRONG BẢN THẢO ===\n${existingSummary}` : '',
    `Hãy tạo ${count} Quyển (tiếp nối hoặc cấu trúc lại toàn bộ đại cương phù hợp với các quyển hiện có).`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}

export interface GeneratedVolumeBlueprint {
  title: string;
  blueprint: VolumeBlueprint;
}

export function parseGenerateVolumesResponse(raw: string): GeneratedVolumeBlueprint[] {
  const parsed = parseJsonSafe(raw, 'Chia Quyển') as Record<string, unknown> | unknown[];
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).volumes)
    ? ((parsed as Record<string, unknown>).volumes as unknown[])
    : [];

  const volumes: GeneratedVolumeBlueprint[] = arr
    .filter((v): v is Record<string, unknown> => Boolean(v && typeof v === 'object'))
    .map((v, idx) => ({
      title: cleanStr(v.title) || `Quyển ${idx + 1}`,
      blueprint: {
        arcGoal: cleanStr(v.arcGoal),
        keyAntagonists: cleanStr(v.keyAntagonists),
        turningPointsAndClimax: cleanStr(v.turningPointsAndClimax),
      },
    }))
    .filter((v) => v.title.length > 0);

  if (volumes.length === 0) {
    throw new Error('Model không trả về danh sách Quyển hợp lệ.');
  }
  return volumes;
}

// 4. Auto-Populate Chapter Outlines inside a Volume
export function buildGenerateVolumeChaptersPrompt(params: {
  projectTitle: string;
  act: ManuscriptAct;
  masterPlotBlocks: MasterPlotBlock[];
  plotThreads: PlotThread[];
  desiredCount?: number;
}): { system: string; user: string } {
  const count = params.desiredCount ?? 6;
  const startNumber = params.act.chapters.length + 1;

  const system = [
    `Bạn là Biên kịch Cấu trúc Chương. Dựa trên Đại cương Quyển và các chương hiện có, hãy lên khung cho ${count} chương tiếp theo (từ Chương ${startNumber} trở đi).`,
    'BẮT BUỘC CHỈ trả về 1 đối tượng JSON hợp lệ:',
    '{',
    '  "chapters": [',
    '    {',
    '      "title": "Chương N: Tên chương súc tích",',
    '      "chapterGoal": "Mục tiêu 1-2 câu về biến cố/xung đột chính cần đạt trong chương",',
    '      "starterBeats": "- Nhịp 1: ...\\n- Nhịp 2: ...\\n- Nhịp 3: ..."',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  const bp = params.act.blueprint ?? DEFAULT_VOLUME_BLUEPRINT;
  const existingChapList = params.act.chapters
    .slice(-8)
    .map((c) => `- ${c.title}${c.chapterGoal ? `: ${c.chapterGoal}` : ''}`)
    .join('\n');

  const user = [
    `Tác phẩm: ${params.projectTitle || 'Untitled Novel'} · Quyển: ${params.act.title}`,
    formatMasterPlotSummary(params.masterPlotBlocks, params.plotThreads),
    `=== ĐẠI CƯƠNG QUYỂN ===\nMục tiêu: ${bp.arcGoal || '(Chưa đặt)'}\nThế lực: ${bp.keyAntagonists || '(Chưa đặt)'}\nCao trào: ${bp.turningPointsAndClimax || '(Chưa đặt)'}`,
    existingChapList ? `=== CÁC CHƯƠNG ĐÃ CÓ TRONG QUYỂN ===\n${existingChapList}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}

export interface GeneratedChapterSkeleton {
  title: string;
  chapterGoal: string;
  starterBeats: string;
}

export function parseGenerateVolumeChaptersResponse(raw: string): GeneratedChapterSkeleton[] {
  const parsed = parseJsonSafe(raw, 'Khung Chương') as Record<string, unknown> | unknown[];
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).chapters)
    ? ((parsed as Record<string, unknown>).chapters as unknown[])
    : [];

  const chapters: GeneratedChapterSkeleton[] = arr
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .map((c, idx) => ({
      title: cleanStr(c.title) || `Chương mới ${idx + 1}`,
      chapterGoal: cleanStr(c.chapterGoal || c.goal),
      starterBeats: cleanStr(c.starterBeats || c.beats),
    }))
    .filter((c) => c.title.length > 0);

  if (chapters.length === 0) {
    throw new Error('Model không trả về danh sách khung Chương hợp lệ.');
  }
  return chapters;
}

export function convertGeneratedChapters(skeletons: GeneratedChapterSkeleton[]): ManuscriptChapter[] {
  return skeletons.map((sk) =>
    createChapter(sk.title, '', sk.starterBeats, 'Draft', sk.chapterGoal)
  );
}

export function convertGeneratedVolumes(volumes: GeneratedVolumeBlueprint[]): ManuscriptAct[] {
  return volumes.map((vol) =>
    createAct(vol.title, [createChapter('Chương 1')], vol.blueprint)
  );
}

// 5. Living Plot Re-alignment ("Cập nhật Đại cương phía sau")
export function buildLivingPlotRealignPrompt(params: {
  projectTitle: string;
  masterPlotBlocks: MasterPlotBlock[];
  plotThreads: PlotThread[];
  summaries: StorySummary[];
  acts: ManuscriptAct[];
}): { system: string; user: string } {
  const system = [
    'Bạn là Cố vấn Điều chỉnh Cốt truyện Sống (Living Plot Re-alignment Architect).',
    'Nhiệm vụ: Đọc Tóm tắt các chương đã viết thực tế + Tuyến truyện đang mở và đối chiếu với Đại cương các Quyển & Mục tiêu các Chương chưa viết (Draft/trống) phía sau. Nếu mạch truyện thực tế đã rẽ hướng, hãy điều chỉnh lại Mục tiêu Quyển hoặc Mục tiêu Chương tương lai cho khớp logic.',
    'BẮT BUỘC CHỈ trả về 1 đối tượng JSON hợp lệ:',
    '{',
    '  "analysis": "Nhận xét ngắn gọn 1-2 câu về những điểm cốt truyện đã rẽ hướng",',
    '  "volumeUpdates": [',
    '    { "actId": "id_quyen", "arcGoal": "...", "keyAntagonists": "...", "turningPointsAndClimax": "..." }',
    '  ],',
    '  "chapterGoalUpdates": [',
    '    { "chapterId": "id_chuong", "chapterGoal": "Mục tiêu mới đã căn chỉnh" }',
    '  ]',
    '}',
  ].join('\n');

  const recentSummaries = params.summaries
    .filter((s) => s.enabled && s.content.trim())
    .slice(-8)
    .map((s) => `### ${s.title}\n${s.content.trim()}`)
    .join('\n\n');

  const upcomingTargets = params.acts
    .map((act) => {
      const upcomingChaps = act.chapters
        .filter((ch) => ch.content.trim().length < 200 || ch.status === 'Draft')
        .map((ch) => `  - [${ch.id}] ${ch.title} (Mục tiêu hiện tại: ${ch.chapterGoal || 'Chưa có'})`)
        .join('\n');
      return `[actId=${act.id}] ${act.title}\n  arcGoal: ${act.blueprint?.arcGoal || ''}\n  keyAntagonists: ${act.blueprint?.keyAntagonists || ''}\n  turningPointsAndClimax: ${act.blueprint?.turningPointsAndClimax || ''}\n${upcomingChaps}`;
    })
    .join('\n\n');

  const user = [
    `Tác phẩm: ${params.projectTitle || 'Untitled Novel'}`,
    formatMasterPlotSummary(params.masterPlotBlocks, params.plotThreads),
    recentSummaries
      ? `=== DIỄN BIẾN ĐÃ VIẾT (TÓM TẮT) ===\n${recentSummaries}`
      : '=== DIỄN BIẾN ĐÃ VIẾT ===\n(Chưa có tóm tắt chương — dựa vào khung hiện có để chuẩn hóa lại mục tiêu)',
    `=== ĐẠI CƯƠNG QUYỂN & CÁC CHƯƠNG SẮP TỚI CẦN CĂN CHỈNH ===\n${upcomingTargets}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}

export interface LivingPlotRealignResult {
  analysis: string;
  volumeUpdates: Array<{
    actId: string;
    blueprint: Partial<VolumeBlueprint>;
  }>;
  chapterGoalUpdates: Array<{
    chapterId: string;
    chapterGoal: string;
  }>;
}

export function parseLivingPlotRealignResponse(raw: string): LivingPlotRealignResult {
  const parsed = parseJsonSafe(raw, 'Cập nhật Đại cương') as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Kết quả Cập nhật Đại cương không phải đối tượng JSON hợp lệ.');
  }

  const rawVols = Array.isArray(parsed.volumeUpdates) ? parsed.volumeUpdates : [];
  const volumeUpdates = rawVols
    .filter((v): v is Record<string, unknown> => Boolean(v && typeof v === 'object'))
    .map((v) => {
      const actId = cleanStr(v.actId);
      const bp: Partial<VolumeBlueprint> = {};
      if (cleanStr(v.arcGoal)) bp.arcGoal = cleanStr(v.arcGoal);
      if (cleanStr(v.keyAntagonists)) bp.keyAntagonists = cleanStr(v.keyAntagonists);
      if (cleanStr(v.turningPointsAndClimax)) {
        bp.turningPointsAndClimax = cleanStr(v.turningPointsAndClimax);
      }
      return { actId, blueprint: bp };
    })
    .filter((v) => v.actId.length > 0 && Object.keys(v.blueprint).length > 0);

  const rawChaps = Array.isArray(parsed.chapterGoalUpdates) ? parsed.chapterGoalUpdates : [];
  const chapterGoalUpdates = rawChaps
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .map((c) => ({
      chapterId: cleanStr(c.chapterId),
      chapterGoal: cleanStr(c.chapterGoal),
    }))
    .filter((c) => c.chapterId.length > 0 && c.chapterGoal.length > 0);

  return {
    analysis: cleanStr(parsed.analysis),
    volumeUpdates,
    chapterGoalUpdates,
  };
}

// 6. Master Plot JSON Import / Export
export interface MasterPlotBundle {
  schema: 'quill_loom_master_plot_v1';
  masterPlotBlocks: MasterPlotBlock[];
  plotThreads: PlotThread[];
}

export function serializeMasterPlotJson(
  blocks: MasterPlotBlock[],
  threads: PlotThread[]
): string {
  const bundle: MasterPlotBundle = {
    schema: 'quill_loom_master_plot_v1',
    masterPlotBlocks: blocks,
    plotThreads: threads,
  };
  return JSON.stringify(bundle, null, 2);
}

export function parseMasterPlotImportJson(rawJson: string): {
  masterPlotBlocks: MasterPlotBlock[];
  plotThreads: PlotThread[];
} {
  const parsed = JSON.parse(rawJson) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Tệp JSON Cốt truyện chính không hợp lệ.');
  }
  const now = Date.now();
  const rawBlocks = Array.isArray(parsed.masterPlotBlocks)
    ? parsed.masterPlotBlocks
    : Array.isArray(parsed.blocks)
    ? parsed.blocks
    : [];
  const rawThreads = Array.isArray(parsed.plotThreads)
    ? parsed.plotThreads
    : Array.isArray(parsed.threads)
    ? parsed.threads
    : [];

  const masterPlotBlocks: MasterPlotBlock[] = rawBlocks
    .filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object'))
    .map((b, idx) => ({
      id: cleanStr(b.id) || `mp_imp_${now}_${idx}`,
      title: cleanStr(b.title) || `Khối cốt truyện ${idx + 1}`,
      content: cleanStr(b.content),
      includeInArchitect:
        typeof b.includeInArchitect === 'boolean' ? b.includeInArchitect : true,
      includeInProse: typeof b.includeInProse === 'boolean' ? b.includeInProse : false,
    }));

  const plotThreads: PlotThread[] = rawThreads
    .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
    .map((t, idx) => ({
      id: cleanStr(t.id) || `pt_imp_${now}_${idx}`,
      title: cleanStr(t.title) || `Tuyến truyện ${idx + 1}`,
      description: cleanStr(t.description),
      introducedChapter: cleanStr(t.introducedChapter) || 'Chương 1',
      status: t.status === 'Resolved' ? 'Resolved' : ('Open' as PlotThreadStatus),
    }));

  if (masterPlotBlocks.length === 0 && plotThreads.length === 0) {
    throw new Error('Không tìm thấy Master Plot Block hoặc Plot Thread hợp lệ trong tệp.');
  }

  return { masterPlotBlocks, plotThreads };
}

export function mergeOrReplaceMasterPlot(
  existingBlocks: MasterPlotBlock[],
  existingThreads: PlotThread[],
  incomingBlocks: MasterPlotBlock[],
  incomingThreads: PlotThread[],
  mode: 'merge' | 'replace'
): {
  masterPlotBlocks: MasterPlotBlock[];
  plotThreads: PlotThread[];
  addedBlocks: number;
  addedThreads: number;
} {
  if (mode === 'replace') {
    return {
      masterPlotBlocks: incomingBlocks,
      plotThreads: incomingThreads,
      addedBlocks: incomingBlocks.length,
      addedThreads: incomingThreads.length,
    };
  }

  const blockTitles = new Set(existingBlocks.map((b) => b.title.trim().toLowerCase()));
  const newBlocks = incomingBlocks.filter(
    (b) => !blockTitles.has(b.title.trim().toLowerCase())
  );

  const threadTitles = new Set(existingThreads.map((t) => t.title.trim().toLowerCase()));
  const newThreads = incomingThreads.filter(
    (t) => !threadTitles.has(t.title.trim().toLowerCase())
  );

  return {
    masterPlotBlocks: [...existingBlocks, ...newBlocks],
    plotThreads: [...existingThreads, ...newThreads],
    addedBlocks: newBlocks.length,
    addedThreads: newThreads.length,
  };
}
