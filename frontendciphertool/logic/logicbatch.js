// 逻辑区按需加载器
// modules.js 只加载此文件；具体谜题脚本在用户点击对应谜题时再加载。
(function () {
    const loadVersion = window.CIPHERTOOL_ASSET_VERSION || '20260531';
    const loadedScripts = new Set();
    const loadedPuzzles = new Set();

    const PUZZLES = {
        sudoku: { init: 'initSudokuGrid', scripts: ['./logic/logicdiv/1_sudoku_ui.js', './logic/js/1_sudoku.js'] },
        akari: { init: 'initAkariGrid', scripts: ['./logic/logicdiv/2_akari_ui.js', './logic/js/2_Akari.js'] },
        aqre: { init: 'initAqreGrid', scripts: ['./logic/logicdiv/3_aqre_ui.js', './logic/js/3_Aqre.js'] },
        aquapelago: { init: 'initAquapelagoGrid', scripts: ['./logic/logicdiv/4_aquapelago_ui.js', './logic/js/4_aquapelago.js'] },
        aquarium: { init: 'initAquariumGrid', scripts: ['./logic/logicdiv/5_aquarium_ui.js', './logic/js/5_aquarium.js'] },
        balanceloop: { init: 'initBalanceloopGrid', scripts: ['./logic/logicdiv/6_balanceloop_ui.js', './logic/js/6_balanceloop.js'] },
        battleship: { init: 'initBattleshipGrid', scripts: ['./logic/logicdiv/7_battleship_ui.js', './logic/js/7_battleship.js'] },
        binairo: { init: 'initBinairoGrid', scripts: ['./logic/logicdiv/8_binairo_ui.js', './logic/js/8_binairo.js'] },
        castlewall: { init: 'initCastlewallGrid', scripts: ['./logic/logicdiv/9_castlewall_ui.js', './logic/js/9_castlewall.js'] },
        cave: { init: 'initCaveGrid', scripts: ['./logic/logicdiv/10_cave_ui.js', './logic/js/10_cave.js'] },
        chocobanana: { init: 'initChocobananaGrid', scripts: ['./logic/logicdiv/11_chocobanana_ui.js', './logic/js/11_chocobanana.js'] },
        chocona: { init: 'initChoconaGrid', scripts: ['./logic/logicdiv/12_chocona_ui.js', './logic/js/12_chocona.js'] },
        countryroad: { init: 'initCountryroadGrid', scripts: ['./logic/logicdiv/13_countryroad_ui.js', './logic/js/13_countryroad.js'] },
        doppelblock: { init: 'initDoppelblockGrid', scripts: ['./logic/logicdiv/14_doppelblock_ui.js', './logic/js/14_doppelblock.js'] },
        easyas: { init: 'initEasyasGrid', scripts: ['./logic/logicdiv/15_easyas_ui.js', './logic/js/15_easyas.js'] },
        fillomino: { init: 'initFillominoGrid', scripts: ['./logic/logicdiv/16_fillomino_ui.js', './logic/js/16_fillomino.js'] },
        gokigen: { init: 'initGokigenGrid', scripts: ['./logic/logicdiv/19_gokigen_ui.js', './logic/js/19_gokigen.js'] },
        haisu: { init: 'initHaisuGrid', scripts: ['./logic/logicdiv/20_haisu_ui.js', './logic/js/20_haisu.js'] },
        haisuslow: { init: 'initHaisuslowGrid', scripts: ['./logic/logicdiv/21_haisuslow_ui.js', './logic/js/21_haisuslow.js'] },
        hamle: { init: 'initHamleGrid', scripts: ['./logic/logicdiv/22_hamle_ui.js', './logic/js/22_hamle.js'] },
        hashi: { init: 'initHashiGrid', scripts: ['./logic/logicdiv/23_hashi_ui.js', './logic/js/23_hashi.js'] },
        heteromino: { init: 'initHeterominoGrid', scripts: ['./logic/logicdiv/24_heteromino_ui.js', './logic/js/24_heteromino.js'] },
        heyawake: { init: 'initHeyawakeGrid', scripts: ['./logic/logicdiv/25_heyawake_ui.js', './logic/js/25_heyawake.js'] },
        hitori: { init: 'initHitoriGrid', scripts: ['./logic/logicdiv/26_hitori_ui.js', './logic/js/26_hitori.js'] },
        hotaru: { init: 'initHotaruGrid', scripts: ['./logic/logicdiv/27_hotaru_ui.js', './logic/js/27_hotaru.js'] },
        kakuro: { init: 'initKakuroGrid', scripts: ['./logic/logicdiv/28_kakuro_ui.js', './logic/js/28_kakuro.js'] },
        kuromasu: { init: 'initKuromasuGrid', scripts: ['./logic/logicdiv/29_kuromasu_ui.js', './logic/js/29_kuromasu.js'] },
        kurotto: { init: 'initKurottoGrid', scripts: ['./logic/logicdiv/30_kurotto_ui.js', './logic/js/30_kurotto.js'] },
        lits: { init: 'initLITSGrid', scripts: ['./logic/logicdiv/31_lits_ui.js', './logic/js/31_lits.js'] },
        magnets: { init: 'initMagnetsGrid', scripts: ['./logic/logicdiv/32_magnets_ui.js', './logic/js/32_magnets.js'] },
        masyu: { init: 'initMasyuGrid', scripts: ['./logic/logicdiv/33_masyu_ui.js', './logic/js/33_masyu.js'] },
        minesweeper: { init: 'initMSGrid', scripts: ['./logic/logicdiv/34_minesweeper_ui.js', './logic/js/34_minesweeper.js'] },
        moonsun: { init: 'initMSUGrid', scripts: ['./logic/logicdiv/35_moonsun_ui.js', './logic/js/35_moonsun.js'] },
        nagare: { init: 'initNGGrid', scripts: ['./logic/logicdiv/36_nagare_ui.js', './logic/js/36_nagare.js'] },
        nanro: { init: 'initNRGrid', scripts: ['./logic/logicdiv/37_nanro_ui.js', './logic/js/37_nanro.js'] },
        ncells: { init: 'initNCGrid', scripts: ['./logic/logicdiv/38_ncells_ui.js', './logic/js/38_ncells.js'] },
        nonogram: { init: 'initNOGrid', scripts: ['./logic/logicdiv/39_nonogram_ui.js', './logic/js/39_nonogram.js'] },
        norinori: { init: 'initNRIGrid', scripts: ['./logic/logicdiv/40_norinori_ui.js', './logic/js/40_norinori.js'] },
        numberlink: { init: 'initNLGrid', scripts: ['./logic/logicdiv/41_numberlink_ui.js', './logic/js/41_numberlink.js'] },
        nuribou: { init: 'initNuribouGrid', scripts: ['./logic/logicdiv/42_nuribou_ui.js', './logic/js/42_nuribou.js'] },
        nurikabe: { init: 'initNurikabeGrid', scripts: ['./logic/logicdiv/43_nurikabe_ui.js', './logic/js/43_nurikabe.js'] },
        nurimisaki: { init: 'initNurimisakiGrid', scripts: ['./logic/logicdiv/44_nurimisaki_ui.js', './logic/js/44_nurimisaki.js'] },
        onsen: { init: 'initOnsenGrid', scripts: ['./logic/logicdiv/45_onsen_ui.js', './logic/js/45_onsen.js'] },
        rippleeffect: { init: 'initRippleGrid', scripts: ['./logic/logicdiv/46_rippleeffect_ui.js', './logic/js/46_rippleeffect.js'] },
        shakashaka: { init: 'initShakashakaGrid', scripts: ['./logic/logicdiv/47_shakashaka_ui.js', './logic/js/47_shakashaka.js'] },
        shikaku: { init: 'initShikakuGrid', scripts: ['./logic/logicdiv/48_shikaku_ui.js', './logic/js/48_shikaku.js'] },
        shimaguni: { init: 'initShimaguniGrid', scripts: ['./logic/logicdiv/49_shimaguni_ui.js', './logic/js/49_shimaguni.js'] },
        skyscrapers: { init: 'initSkyscrapersGrid', scripts: ['./logic/logicdiv/50_skyscrapers_ui.js', './logic/js/50_skyscrapers.js'] },
        slitherlink: { init: 'initSlitherlinkGrid', scripts: ['./logic/logicdiv/51_slitherlink_ui.js', './logic/js/51_slitherlink.js'] },
        spiralgalaxies: { init: 'initSGGrid', scripts: ['./logic/logicdiv/52_spiralgalaxies_ui.js', './logic/js/52_spiralgalaxies.js'] },
        starbattle: { init: 'initSBGrid', scripts: ['./logic/logicdiv/53_starbattle_ui.js', './logic/js/53_starbattle.js'] },
        statuepark: { init: 'initStatueparkGrid', scripts: ['./logic/logicdiv/54_statuepark_ui.js', './logic/js/54_statuepark.js'] },
        stostone: { init: 'initStostoneGrid', scripts: ['./logic/logicdiv/55_stostone_ui.js', './logic/js/55_stostone.js'] },
        tapa: { init: 'initTapaGrid', scripts: ['./logic/logicdiv/56_tapa_ui.js', './logic/js/56_tapa.js'] },
        tatamibari: { init: 'initTatamibariGrid', scripts: ['./logic/logicdiv/57_tatamibari_ui.js', './logic/js/57_tatamibari.js'] },
        tents: { init: 'initTentsGrid', scripts: ['./logic/logicdiv/58_tents_ui.js', './logic/js/58_tents.js'] },
        tll: { init: 'initTllGrid', scripts: ['./logic/logicdiv/59_tll_ui.js', './logic/js/59_tll.js'] },
        tren: { init: 'initTrenGrid', scripts: ['./logic/logicdiv/60_tren_ui.js', './logic/js/60_tren.js'] },
        yajilin: { init: 'initYajilinGrid', scripts: ['./logic/logicdiv/61_yajilin_ui.js', './logic/js/61_yajilin.js'] },
        yajisankazusan: { init: 'initYKGrid', scripts: ['./logic/logicdiv/62_yajisankazusan_ui.js', './logic/js/62_yajisankazusan.js'] },
        yinyang: { init: 'initYinyangGrid', scripts: ['./logic/logicdiv/63_yinyang_ui.js', './logic/js/63_yinyang.js'] }
    };

    function scriptUrl(src) {
        return `${src}?v=${loadVersion}`;
    }

    function isScriptLoaded(src) {
        return loadedScripts.has(src) || Boolean(document.querySelector(`script[data-loader-src="${src}"]`));
    }

    function loadScript(src) {
        if (isScriptLoaded(src)) return Promise.resolve();
        loadedScripts.add(src);
        return new Promise(resolve => {
            const script = document.createElement('script');
            script.src = scriptUrl(src);
            script.async = false;
            script.dataset.loaderSrc = src;
            script.onload = script.onerror = resolve;
            document.body.appendChild(script);
        });
    }

    function loadSequential(list) {
        return list.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve());
    }

    function getWorkspaceId(target) {
        return `${target}-workspace`;
    }

    function appendWorkspace(target) {
        const workspaceId = getWorkspaceId(target);
        if (document.getElementById(workspaceId)) return true;
        const container = document.getElementById('logic-workspace-container');
        if (!container) return false;
        const html = (window.logicWorkspaceHTMLs || []).find(item =>
            item.includes(`id="${workspaceId}"`) || item.includes(`id='${workspaceId}'`)
        );
        if (!html) return false;
        container.insertAdjacentHTML('beforeend', html);
        return true;
    }

    function showWorkspace(target) {
        const list = document.getElementById('logic-list-container');
        const container = document.getElementById('logic-workspace-container');
        const workspace = document.getElementById(getWorkspaceId(target));
        if (!container || !workspace) return;
        if (list) list.style.display = 'none';
        container.style.display = 'block';
        container.querySelectorAll(':scope > div').forEach(el => {
            if (el.id && el.id.endsWith('-workspace')) el.style.display = 'none';
        });
        workspace.style.display = 'flex';
    }

    async function openLogicPuzzle(target) {
        const meta = PUZZLES[target];
        if (!meta) return;
        if (!loadedPuzzles.has(target)) {
            await loadSequential(meta.scripts);
            loadedPuzzles.add(target);
        }
        appendWorkspace(target);
        showWorkspace(target);
        if (typeof window[meta.init] === 'function') {
            window[meta.init]();
        }
    }

    window.openLogicPuzzle = openLogicPuzzle;
    window.logicPuzzleLoader = {
        puzzles: PUZZLES,
        loadPuzzle: openLogicPuzzle
    };

    loadSequential(['./logic/logicdiv/0_logic_ui.js', './logic/logicdiv/logic_module.js'])
        .then(() => {
            if (typeof initLogicModule === 'function') initLogicModule();
        });
})();
