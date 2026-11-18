import {
  ApiSettings,
  ChapterSnapshot,
  ChapterStatus,
  DEFAULT_AGENT_CONTEXT_TOGGLES,
  DEFAULT_API_SETTINGS,
  DEFAULT_ARCHITECT_API_SETTINGS,
  DEFAULT_PROTAGONIST_PROFILE,
  DEFAULT_SAMPLER_SETTINGS,
  DEFAULT_USAGE_STATS,
  DEFAULT_VOLUME_BLUEPRINT,
  LegacyManuscriptScene,
  ManuscriptAct,
  ManuscriptChapter,
  MasterPlotBlock,
  PlotThread,
  StoryProject,
  UsageStats,
} from '../types/novel';
import { compileStoryTextFromActs, createAct, createChapter } from './manuscriptEngine';
import {
  readActiveProjectIdFromIndexedDB,
  readProjectsFromIndexedDB,
  writeActiveProjectIdToIndexedDB,
  writeProjectsToIndexedDB,
} from './idbStorage';
import { createStarterMasterPlotBlocks } from './plotArchitectEngine';

const STORAGE_PROJECTS_KEY = 'quill_loom_projects_v1';
const STORAGE_ACTIVE_ID_KEY = 'quill_loom_active_project_id_v1';
const STORAGE_API_KEY = 'quill_loom_api_settings_v1';
const STORAGE_USAGE_KEY = 'quill_loom_usage_stats_v1';
const STORAGE_BACKUP_INFO_KEY = 'quill_loom_backup_info_v1';

export const DEFAULT_VIETNAMESE_SYSTEM_PROMPT = [
  'Bạn là một tiểu thuyết gia tiên hiệp và văn học mạng tiếng Việt bậc thầy.',
  'Phong cách: Ngôn từ trau chuốt, giàu hình ảnh, tiết chế tính từ sáo rỗng, miêu tả hành động và tâm lý tinh tế.',
  'Quy tắc đại từ & từ ngữ: Tuyệt đối tránh dùng từ dịch thô/hiện đại như "anh ta", "cô ta", "bọn họ"; ưu tiên gọi theo tên nhân vật, chức danh, "hắn", "nàng", "y", "lão".',
  'Mạch truyện: Chỉ viết tiếp diễn biến tự nhiên sau câu cuối cùng, không tóm tắt lại, không lặp lại ý đã viết, không thêm lời bình của tác giả.',
].join('\n');

const STARTER_CHAP_1_CONTENT = `Sương sớm trên đỉnh Vân Vụ Sơn đặc quánh như sữa, quyện theo mùi linh thảo ẩm ướt phả vào gương mặt gầy gò của Lâm Huyền. Đứng bên bờ vực đá Thanh Phong Nhai, thiếu niên áo xám khẽ siết chặt mảnh ngọc bội thanh đồng giấu trong vạt áo.

Mỗi khi mảnh ngọc chạm vào da thịt, luồng linh khí hỗn tạp trong kinh mạch y lại bị lọc đi một phần, hóa thành dòng nước ấm chảy về đan điền. Tư chất ngũ hành tạp linh căn vốn bị ngoại môn coi là phế vật, nhờ cơ duyên này mà ba tháng qua đã miễn cưỡng chạm tới ngưỡng Luyện Khí tầng ba.`;

const STARTER_CHAP_2_CONTENT = `Tiếng bước chân nặng nề vang lên trên lối đá cuội dẫn xuống ngoại môn dược điền. Triệu Phong — chấp sự Luyện Khí tầng năm phụ trách khu Linh Thảo — tay vắt chéo sau lưng, ánh mắt lạnh nhạt đảo qua đám tạp dịch đang cúi gằm mặt.

"Tháng này sản lượng Huyết Tinh Thảo hụt ba gốc," Triệu Phong dừng ngay trước luống thuốc của Lâm Huyền, khóe môi nhếch lên một nụ cười nhạt. "Lâm sư đệ, mỗi người nộp thêm hai khối linh thạch hạ phẩm gọi là phí bảo hộ tuần sơn, hẳn ngươi không có ý kiến chứ?"`;

export function createTuTienSeedProject(): StoryProject {
  const now = Date.now();
  const chap1 = createChapter(
    'Chương 1: Sương Sớm Vân Vụ Sơn',
    STARTER_CHAP_1_CONTENT,
    '- Nhịp 1: Lâm Huyền tĩnh tọa bên bờ vực Thanh Phong Nhai, cảm nhận mảnh Ngọc Bội Thanh Đồng thanh lọc linh khí tạp chất.\n- Nhịp 2: Khẳng định cảnh giới Luyện Khí tầng ba sau ba tháng ẩn nhẫn.\n- Nhịp 3: Chuẩn bị xuống núi nhận phần việc ở ngoại môn dược điền.',
    'Draft',
    'Giới thiệu cơ duyên Ngọc Bội Thanh Đồng và thế yếu của Lâm Huyền tại ngoại môn Thanh Vân Tông.'
  );
  const chap2 = createChapter(
    'Chương 2: Áp Bức Nơi Dược Điền',
    STARTER_CHAP_2_CONTENT,
    '[ĐÃ DIỄN RA]\n- Chấp sự Triệu Phong lấy cớ hụt Huyết Tinh Thảo để đòi thu hai khối linh thạch hạ phẩm phí bảo hộ.\n\n[TIẾP THEO]\n- Lâm Huyền nhẫn nhịn quan sát sơ hở của Triệu Phong thay vì đối đầu trực diện.\n- Mảnh Ngọc Bội Thanh Đồng khẽ rung lên trước gốc Huyết Tinh Thảo héo úa gần đó.',
    'Draft',
    'Thiết lập xung đột trực tiếp với chấp sự Triệu Phong và gieo manh mối dị biến linh thảo.'
  );

  const act1 = createAct('Quyển 1: Ngoại Môn Phong Ba', [chap1, chap2], {
    arcGoal:
      'Lâm Huyền ẩn nhẫn nâng cao tu vi từ Luyện Khí tầng ba lên Trúc Cơ, tìm ra chứng cứ tham ô của chấp sự Triệu Phong để thoát khỏi sự chèn ép ở ngoại môn.',
    keyAntagonists: 'Chấp sự Triệu Phong (Luyện Khí tầng 5) và nhóm đệ tử thân tín của Hắc Phong Đường.',
    turningPointsAndClimax:
      'Phát hiện bí mật Ngọc Bội có thể phục hồi linh thảo cấp cao -> bị Triệu Phong vu oan trộm thuốc -> phản sát trong kỳ thí luyện ngoại môn.',
  });

  const starterThreads: PlotThread[] = [
    {
      id: 'pt_seed_jade',
      title: 'Bí ẩn mảnh Ngọc Bội Thanh Đồng',
      description:
        'Nguồn gốc mảnh ngọc có khả năng thanh lọc tạp linh khí và phản ứng lạ với cổ trận thượng cổ.',
      introducedChapter: 'Chương 1: Sương Sớm Vân Vụ Sơn',
      status: 'Open',
    },
    {
      id: 'pt_seed_zhao',
      title: 'Âm mưu bòn rút linh thạch của Triệu Phong',
      description:
        'Triệu Phong thu phí bảo hộ trái phép và cấu kết tuồn Huyết Tinh Thảo ra ngoài tông môn.',
      introducedChapter: 'Chương 2: Áp Bức Nơi Dược Điền',
      status: 'Open',
    },
  ];

  const acts = [act1];
  return {
    id: `proj_${now}`,
    title: 'Thanh Đồng Kiếm Đạo',
    acts,
    activeChapterId: chap2.id,
    storyText: compileStoryTextFromActs(acts),
    systemPrompt: DEFAULT_VIETNAMESE_SYSTEM_PROMPT,
    memory:
      'Bối cảnh: Thanh Vân Tông là tông môn chính đạo trung lưu ở Đông Hoang. Ngoại môn đệ tử chia làm nhiều dược điền và khoáng mạch.',
    authorsNote:
      'Giữ văn phong trầm ổn, tả cảnh và nội tâm súc tích. Chú trọng chi tiết đối đáp kín kẽ của Lâm Huyền.',
    authorsNoteDepth: 2,
    lorebook: [
      {
        id: `lore_seed_1`,
        name: 'Ngọc Bội Thanh Đồng',
        keywords: 'ngọc bội, thanh đồng, mảnh ngọc',
        content:
          'Mảnh ngọc cổ sứt mẻ mà Lâm Huyền nhặt được từ di tích phàm giới. Có khả năng thanh lọc linh khí tạp chất và kích phát sinh cơ thực vật.',
        enabled: true,
      },
      {
        id: `lore_seed_2`,
        name: 'Thanh Vân Tông',
        keywords: 'Thanh Vân Tông, Vân Vụ Sơn, ngoại môn, dược điền',
        content:
          'Tông môn tu tiên tọa lạc trên dãy Vân Vụ Sơn, chia thành Tạp Dịch, Ngoại Môn, Nội Môn và Chân Truyền.',
        enabled: true,
      },
    ],
    protagonist: {
      ...DEFAULT_PROTAGONIST_PROFILE,
      name: 'Lâm Huyền',
      ageOrTitle: '16 tuổi · Đệ tử Ngoại môn',
      personality: 'Trầm tĩnh, cẩn trọng, giỏi quan sát, biết ẩn nhẫn chờ thời cơ.',
      background: 'Xuất thân sơn thôn, ngũ hành tạp linh căn, nhập Thanh Vân Tông ba năm.',
      appearance: 'Áo xám bạc màu, dáng người mảnh khảnh nhưng ánh mắt sáng quắc.',
      goal: 'Tích lũy tài nguyên đột phá Trúc Cơ, giải mã bí mật mảnh Ngọc Bội Thanh Đồng.',
      realm: 'Luyện Khí tầng 3',
      techniques: 'Thanh Vân Dẫn Khí Quyết (nhập môn)',
      resources: '4 khối linh thạch hạ phẩm',
      inventory: 'Mảnh Ngọc Bội Thanh Đồng, liềm cắt thuốc bằng thiết tinh',
    },
    characters: [
      {
        id: 'char_seed_zhaofeng',
        name: 'Triệu Phong',
        aliases: 'Triệu chấp sự, Triệu sư huynh',
        role: 'Đối thủ',
        appearanceAndPersonality: 'Áo xanh thêu văn vân, kiêu ngạo, tham lam và thủ đoạn.',
        currentStatusAndRelationship: 'Luyện Khí tầng 5, đang ép Lâm Huyền nộp phí bảo hộ dược điền.',
        notes: 'Có quan hệ ngầm với thương nhân chợ đen dưới chân núi.',
        enabled: true,
      },
    ],
    longTermMemories: [
      {
        id: 'mem_seed_1',
        content: 'Lâm Huyền âm thầm sở hữu Ngọc Bội Thanh Đồng, tuyệt đối không để lộ trước người khác.',
        keywords: 'ngọc bội, bí mật, Lâm Huyền',
        category: 'Bí mật',
        importance: 5,
        createdAt: now,
        enabled: true,
      },
    ],
    summaries: [
      {
        id: 'sum_seed_1',
        title: 'Tóm tắt Chương 1: Sương Sớm Vân Vụ Sơn',
        content:
          '- Lâm Huyền sử dụng Ngọc Bội Thanh Đồng thanh lọc linh khí, đạt Luyện Khí tầng 3.\n- Giữ kín bí mật mảnh ngọc và chuẩn bị làm việc tại dược điền.',
        enabled: true,
        createdAt: now,
      },
    ],
    masterPlotBlocks: createStarterMasterPlotBlocks('xianxia'),
    plotThreads: starterThreads,
    agentHistory: [],
    agentContextToggles: { ...DEFAULT_AGENT_CONTEXT_TOGGLES },
    sampler: { ...DEFAULT_SAMPLER_SETTINGS },
    updatedAt: now,
  };
}

export const createSeedProject = createTuTienSeedProject;

export function createBlankProject(title = 'Tác phẩm mới'): StoryProject {
  const now = Date.now();
  const chap1 = createChapter('Chương 1');
  const act1 = createAct('Quyển 1', [chap1]);
  return {
    id: `proj_${now}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    acts: [act1],
    activeChapterId: chap1.id,
    storyText: '',
    systemPrompt: DEFAULT_VIETNAMESE_SYSTEM_PROMPT,
    memory: '',
    authorsNote: '',
    authorsNoteDepth: 2,
    lorebook: [],
    protagonist: { ...DEFAULT_PROTAGONIST_PROFILE },
    characters: [],
    longTermMemories: [],
    summaries: [],
    masterPlotBlocks: createStarterMasterPlotBlocks('general'),
    plotThreads: [],
    agentHistory: [],
    agentContextToggles: { ...DEFAULT_AGENT_CONTEXT_TOGGLES },
    sampler: { ...DEFAULT_SAMPLER_SETTINGS },
    updatedAt: now,
  };
}

function normalizeStatus(status: unknown): ChapterStatus {
  if (status === 'Revised' || status === 'Final') return status;
  return 'Draft';
}

function normalizeSnapshots(raw: unknown): ChapterSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
    .map((s) => ({
      id: typeof s.id === 'string' && s.id ? s.id : `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: typeof s.label === 'string' ? s.label : 'Snapshot',
      title: typeof s.title === 'string' ? s.title : 'Chương',
      content: typeof s.content === 'string' ? s.content : '',
      beats: typeof s.beats === 'string' ? s.beats : '',
      ...(typeof s.chapterGoal === 'string' ? { chapterGoal: s.chapterGoal } : {}),
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
    }))
    .slice(0, 10);
}

/**
 * Losslessly migrates acts from either current Volume->Chapter schema or legacy Volume->Chapter->Scenes[] schema.
 * Merges legacy `scenes[]` into the parent chapter's `content`, `beats`, and `snapshots`, and returns a sceneId->chapterId map.
 */
export function migrateActs(
  rawActs: unknown,
  legacyStoryText = ''
): { acts: ManuscriptAct[]; sceneToChapterMap: Record<string, string> } {
  const sceneToChapterMap: Record<string, string> = {};
  if (!Array.isArray(rawActs) || rawActs.length === 0) {
    const chap = createChapter('Chương 1', legacyStoryText);
    return {
      acts: [createAct('Quyển 1', [chap])],
      sceneToChapterMap,
    };
  }

  const acts: ManuscriptAct[] = rawActs
    .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object'))
    .map((rawAct, actIdx) => {
      const rawBp =
        rawAct.blueprint && typeof rawAct.blueprint === 'object'
          ? (rawAct.blueprint as Record<string, unknown>)
          : {};
      const blueprint = {
        ...DEFAULT_VOLUME_BLUEPRINT,
        arcGoal: typeof rawBp.arcGoal === 'string' ? rawBp.arcGoal : '',
        keyAntagonists: typeof rawBp.keyAntagonists === 'string' ? rawBp.keyAntagonists : '',
        turningPointsAndClimax:
          typeof rawBp.turningPointsAndClimax === 'string' ? rawBp.turningPointsAndClimax : '',
      };

      const rawChapters = Array.isArray(rawAct.chapters) ? rawAct.chapters : [];
      const chapters: ManuscriptChapter[] = rawChapters
        .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
        .map((rawChap, chapIdx) => {
          const chapId =
            typeof rawChap.id === 'string' && rawChap.id
              ? rawChap.id
              : `chap_mig_${Date.now()}_${actIdx}_${chapIdx}`;
          const chapTitle =
            typeof rawChap.title === 'string' && rawChap.title.trim()
              ? rawChap.title.trim()
              : `Chương ${chapIdx + 1}`;

          const legacyScenes = Array.isArray(rawChap.scenes)
            ? (rawChap.scenes as LegacyManuscriptScene[])
            : [];

          let content = typeof rawChap.content === 'string' ? rawChap.content : '';
          let beats = typeof rawChap.beats === 'string' ? rawChap.beats : '';
          let snapshots = normalizeSnapshots(rawChap.snapshots);
          let status = normalizeStatus(rawChap.status);

          if (legacyScenes.length > 0) {
            const sceneContents: string[] = [];
            const sceneBeats: string[] = [];
            const mergedSnaps: ChapterSnapshot[] = [...snapshots];

            for (const sc of legacyScenes) {
              if (!sc || typeof sc !== 'object') continue;
              if (typeof sc.id === 'string' && sc.id) {
                sceneToChapterMap[sc.id] = chapId;
              }
              if (typeof sc.content === 'string' && sc.content.trim()) {
                sceneContents.push(sc.content.trim());
              }
              if (typeof sc.beats === 'string' && sc.beats.trim()) {
                sceneBeats.push(
                  legacyScenes.length > 1 && sc.title
                    ? `(${sc.title})\n${sc.beats.trim()}`
                    : sc.beats.trim()
                );
              }
              if (Array.isArray(sc.snapshots)) {
                mergedSnaps.push(...normalizeSnapshots(sc.snapshots));
              }
              if (sc.status === 'Final') status = 'Final';
              else if (sc.status === 'Revised' && status === 'Draft') status = 'Revised';
            }

            if (!content.trim() && sceneContents.length > 0) {
              content = sceneContents.join('\n\n');
            }
            if (!beats.trim() && sceneBeats.length > 0) {
              beats = sceneBeats.join('\n\n');
            }
            snapshots = mergedSnaps
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 10);
          }

          return {
            id: chapId,
            title: chapTitle,
            content,
            beats,
            chapterGoal: typeof rawChap.chapterGoal === 'string' ? rawChap.chapterGoal : '',
            status,
            snapshots,
            updatedAt: typeof rawChap.updatedAt === 'number' ? rawChap.updatedAt : Date.now(),
          };
        });

      const finalChapters = chapters.length > 0 ? chapters : [createChapter('Chương 1')];

      return {
        id:
          typeof rawAct.id === 'string' && rawAct.id
            ? rawAct.id
            : `act_mig_${Date.now()}_${actIdx}`,
        title:
          typeof rawAct.title === 'string' && rawAct.title.trim()
            ? rawAct.title.trim()
            : `Quyển ${actIdx + 1}`,
        blueprint,
        chapters: finalChapters,
        collapsed: Boolean(rawAct.collapsed),
      };
    });

  if (acts.length === 0) {
    const chap = createChapter('Chương 1', legacyStoryText);
    return { acts: [createAct('Quyển 1', [chap])], sceneToChapterMap };
  }

  return { acts, sceneToChapterMap };
}

export function migrateProject(raw: unknown): StoryProject {
  if (!raw || typeof raw !== 'object') {
    return createTuTienSeedProject();
  }
  const obj = raw as Record<string, unknown>;
  const legacyStoryText = typeof obj.storyText === 'string' ? obj.storyText : '';
  const { acts, sceneToChapterMap } = migrateActs(obj.acts, legacyStoryText);

  const allChapterIds = new Set<string>();
  acts.forEach((a) => a.chapters.forEach((c) => allChapterIds.add(c.id)));
  const firstChapterId = acts[0].chapters[0].id;

  let activeChapterId = firstChapterId;
  if (typeof obj.activeChapterId === 'string' && allChapterIds.has(obj.activeChapterId)) {
    activeChapterId = obj.activeChapterId;
  } else if (typeof obj.activeSceneId === 'string') {
    if (sceneToChapterMap[obj.activeSceneId] && allChapterIds.has(sceneToChapterMap[obj.activeSceneId])) {
      activeChapterId = sceneToChapterMap[obj.activeSceneId];
    } else if (allChapterIds.has(obj.activeSceneId)) {
      activeChapterId = obj.activeSceneId;
    }
  }

  const rawBlocks = Array.isArray(obj.masterPlotBlocks)
    ? (obj.masterPlotBlocks as MasterPlotBlock[])
    : createStarterMasterPlotBlocks('general');

  const rawThreads = Array.isArray(obj.plotThreads)
    ? (obj.plotThreads as PlotThread[])
    : [];

  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : `proj_${Date.now()}`,
    title: typeof obj.title === 'string' && obj.title.trim() ? obj.title : 'Untitled Novel',
    acts,
    activeChapterId,
    storyText: compileStoryTextFromActs(acts),
    systemPrompt:
      typeof obj.systemPrompt === 'string' ? obj.systemPrompt : DEFAULT_VIETNAMESE_SYSTEM_PROMPT,
    memory: typeof obj.memory === 'string' ? obj.memory : '',
    authorsNote: typeof obj.authorsNote === 'string' ? obj.authorsNote : '',
    authorsNoteDepth:
      typeof obj.authorsNoteDepth === 'number' ? obj.authorsNoteDepth : 2,
    lorebook: Array.isArray(obj.lorebook) ? obj.lorebook : [],
    protagonist: {
      ...DEFAULT_PROTAGONIST_PROFILE,
      ...(obj.protagonist && typeof obj.protagonist === 'object' ? obj.protagonist : {}),
    },
    characters: Array.isArray(obj.characters) ? obj.characters : [],
    longTermMemories: Array.isArray(obj.longTermMemories) ? obj.longTermMemories : [],
    summaries: Array.isArray(obj.summaries) ? obj.summaries : [],
    masterPlotBlocks: rawBlocks.map((b, idx) => ({
      id: typeof b.id === 'string' && b.id ? b.id : `mp_${Date.now()}_${idx}`,
      title: typeof b.title === 'string' ? b.title : `Khối ${idx + 1}`,
      content: typeof b.content === 'string' ? b.content : '',
      includeInArchitect:
        typeof b.includeInArchitect === 'boolean' ? b.includeInArchitect : true,
      includeInProse: typeof b.includeInProse === 'boolean' ? b.includeInProse : false,
    })),
    plotThreads: rawThreads.map((t, idx) => ({
      id: typeof t.id === 'string' && t.id ? t.id : `pt_${Date.now()}_${idx}`,
      title: typeof t.title === 'string' ? t.title : `Tuyến truyện ${idx + 1}`,
      description: typeof t.description === 'string' ? t.description : '',
      introducedChapter:
        typeof t.introducedChapter === 'string' ? t.introducedChapter : 'Chương 1',
      status: t.status === 'Resolved' ? 'Resolved' : 'Open',
    })),
    agentHistory: Array.isArray(obj.agentHistory) ? obj.agentHistory : [],
    agentContextToggles: {
      ...DEFAULT_AGENT_CONTEXT_TOGGLES,
      ...(obj.agentContextToggles && typeof obj.agentContextToggles === 'object'
        ? obj.agentContextToggles
        : {}),
    },
    sampler: {
      ...DEFAULT_SAMPLER_SETTINGS,
      ...(obj.sampler && typeof obj.sampler === 'object' ? obj.sampler : {}),
    },
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now(),
  };
}

export function loadProjects(): StoryProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => migrateProject(p));
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return [createTuTienSeedProject()];
}

export async function loadProjectsWithIDBMigration(): Promise<{
  projects: StoryProject[];
  activeProjectId: string;
}> {
  const idbProjects = await readProjectsFromIndexedDB();
  const idbActiveId = await readActiveProjectIdFromIndexedDB();

  if (idbProjects && idbProjects.length > 0) {
    const migrated = idbProjects.map((p) => migrateProject(p));
    const activeId =
      idbActiveId && migrated.some((p) => p.id === idbActiveId)
        ? idbActiveId
        : migrated[0].id;
    return { projects: migrated, activeProjectId: activeId };
  }

  // Fallback / migrate from localStorage if present
  const lsProjects = loadProjects();
  const lsActive = loadActiveProjectId(lsProjects[0].id);
  const activeId = lsProjects.some((p) => p.id === lsActive) ? lsActive : lsProjects[0].id;
  await writeProjectsToIndexedDB(lsProjects);
  await writeActiveProjectIdToIndexedDB(activeId);
  return { projects: lsProjects, activeProjectId: activeId };
}

export function saveProjects(projects: StoryProject[]): void {
  void writeProjectsToIndexedDB(projects);
  try {
    const serialized = JSON.stringify(projects);
    if (serialized.length < 2_500_000) {
      localStorage.setItem(STORAGE_PROJECTS_KEY, serialized);
    }
  } catch {
    // Ignore localStorage quota exceeded when manuscript grows large (IndexedDB handles it)
  }
}

export function loadActiveProjectId(fallbackId: string): string {
  try {
    const id = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
    return id || fallbackId;
  } catch {
    return fallbackId;
  }
}

export function saveActiveProjectId(id: string): void {
  void writeActiveProjectIdToIndexedDB(id);
  try {
    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, id);
  } catch {
    // Ignore
  }
}

export function loadApiSettings(): ApiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_API_KEY);
    if (!raw) return { ...DEFAULT_API_SETTINGS, architectApi: { ...DEFAULT_ARCHITECT_API_SETTINGS } };
    const parsed = JSON.parse(raw) as Partial<ApiSettings>;
    return {
      ...DEFAULT_API_SETTINGS,
      ...parsed,
      architectApi: {
        ...DEFAULT_ARCHITECT_API_SETTINGS,
        ...(parsed.architectApi ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_API_SETTINGS, architectApi: { ...DEFAULT_ARCHITECT_API_SETTINGS } };
  }
}

export function saveApiSettings(settings: ApiSettings): void {
  try {
    localStorage.setItem(STORAGE_API_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function loadUsageStats(): UsageStats {
  try {
    const raw = localStorage.getItem(STORAGE_USAGE_KEY);
    if (!raw) return { ...DEFAULT_USAGE_STATS };
    const parsed = JSON.parse(raw) as Partial<UsageStats>;
    return {
      ...DEFAULT_USAGE_STATS,
      ...parsed,
      sessionPromptTokens: 0,
      sessionCompletionTokens: 0,
      sessionCostUsd: 0,
    };
  } catch {
    return { ...DEFAULT_USAGE_STATS };
  }
}

export function saveUsageStats(stats: UsageStats): void {
  try {
    localStorage.setItem(STORAGE_USAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore
  }
}

export interface BackupReminderInfo {
  lastBackupAt: number;
  chaptersWrittenSinceBackup: number;
}

export function loadBackupInfo(): BackupReminderInfo {
  try {
    const raw = localStorage.getItem(STORAGE_BACKUP_INFO_KEY);
    if (!raw) return { lastBackupAt: 0, chaptersWrittenSinceBackup: 0 };
    const parsed = JSON.parse(raw) as Partial<BackupReminderInfo>;
    return {
      lastBackupAt: typeof parsed.lastBackupAt === 'number' ? parsed.lastBackupAt : 0,
      chaptersWrittenSinceBackup:
        typeof parsed.chaptersWrittenSinceBackup === 'number'
          ? parsed.chaptersWrittenSinceBackup
          : 0,
    };
  } catch {
    return { lastBackupAt: 0, chaptersWrittenSinceBackup: 0 };
  }
}

export function saveBackupInfo(info: BackupReminderInfo): void {
  try {
    localStorage.setItem(STORAGE_BACKUP_INFO_KEY, JSON.stringify(info));
  } catch {
    // Ignore
  }
}
