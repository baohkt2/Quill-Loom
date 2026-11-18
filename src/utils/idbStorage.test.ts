import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendSceneSnapshot,
  createSceneSnapshot,
  MAX_SCENE_SNAPSHOTS,
  restoreSceneFromSnapshot,
} from './idbStorage';
import { ManuscriptScene } from '../types/novel';

test('appendSceneSnapshot prepends newest snapshot and caps history at 10 items', () => {
  let snapshots = undefined as ReturnType<typeof appendSceneSnapshot> | undefined;
  for (let i = 1; i <= 14; i++) {
    const snap = createSceneSnapshot(
      { title: `Scene v${i}`, content: `Draft content ${i}`, beats: '' },
      `Backup ${i}`
    );
    snapshots = appendSceneSnapshot(snapshots, snap);
  }

  assert.ok(snapshots);
  assert.equal(snapshots.length, MAX_SCENE_SNAPSHOTS);
  assert.equal(snapshots[0].label, 'Backup 14');
  assert.equal(snapshots[snapshots.length - 1].label, 'Backup 5');
});

test('restoreSceneFromSnapshot restores content/beats and auto-saves pre-restore backup', () => {
  const olderSnap = {
    id: 'snap_old',
    label: 'Before rewrite',
    title: 'Cảnh 1 (cũ)',
    content: 'Sương đêm trên đỉnh Thanh Vân.',
    beats: '- Beat cũ',
    createdAt: 1000,
  };

  const scene: ManuscriptScene = {
    id: 'scene_1',
    title: 'Cảnh 1 (mới)',
    content: 'Đoạn mới viết sai hướng.',
    beats: '- Beat mới',
    status: 'Draft',
    snapshots: [olderSnap],
    updatedAt: 2000,
  };

  const restored = restoreSceneFromSnapshot(scene, 'snap_old');
  assert.equal(restored.title, 'Cảnh 1 (cũ)');
  assert.equal(restored.content, 'Sương đêm trên đỉnh Thanh Vân.');
  assert.equal(restored.beats, '- Beat cũ');
  assert.equal(restored.snapshots?.length, 2);
  assert.equal(restored.snapshots?.[0].content, 'Đoạn mới viết sai hướng.');
});
