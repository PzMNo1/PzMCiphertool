// 逻辑区分层加载器
// 由 modules.js 加载此文件，负责逻辑区所有谜题脚本的分批加载和初始化
(function () {
    const loadVersion = new Date().getTime();
    function loadBatch(list) {
        return Promise.all(list.map(src => new Promise(resolve => {
            const s = document.createElement('script');
            s.src = src + '?v=' + loadVersion;
            s.onload = s.onerror = resolve;
            document.body.appendChild(s);
        })));
    }

    // ===== 第一批（1-45号谜题 + 公共UI + 模块入口）=====
    const logicBatch1 = [
        './logic/logicdiv/0_logic_ui.js',
        './logic/logicdiv/1_sudoku_ui.js',
        './logic/logicdiv/2_akari_ui.js',
        './logic/logicdiv/3_aqre_ui.js',
        './logic/logicdiv/4_aquapelago_ui.js',
        './logic/logicdiv/logic_module.js',
        './logic/js/1_sudoku.js',
        './logic/js/2_Akari.js',
        './logic/js/3_Aqre.js',
        './logic/js/4_aquapelago.js',
        './logic/logicdiv/5_aquarium_ui.js',
        './logic/js/5_aquarium.js',
        './logic/logicdiv/6_balanceloop_ui.js',
        './logic/js/6_balanceloop.js',
        './logic/logicdiv/7_battleship_ui.js',
        './logic/js/7_battleship.js',
        './logic/logicdiv/8_binairo_ui.js',
        './logic/js/8_binairo.js',
        './logic/logicdiv/9_castlewall_ui.js',
        './logic/js/9_castlewall.js',
        './logic/logicdiv/10_cave_ui.js',
        './logic/js/10_cave.js',
        './logic/logicdiv/11_chocobanana_ui.js',
        './logic/js/11_chocobanana.js',
        './logic/logicdiv/12_chocona_ui.js',
        './logic/js/12_chocona.js',
        './logic/logicdiv/13_countryroad_ui.js',
        './logic/js/13_countryroad.js',
        './logic/logicdiv/14_doppelblock_ui.js',
        './logic/js/14_doppelblock.js',
        './logic/logicdiv/15_easyas_ui.js',
        './logic/js/15_easyas.js',
        './logic/logicdiv/16_fillomino_ui.js',
        './logic/js/16_fillomino.js',
        './logic/logicdiv/19_gokigen_ui.js',
        './logic/js/19_gokigen.js',
        './logic/logicdiv/20_haisu_ui.js',
        './logic/js/20_haisu.js',
        './logic/logicdiv/21_haisuslow_ui.js',
        './logic/js/21_haisuslow.js',
        './logic/logicdiv/22_hamle_ui.js',
        './logic/js/22_hamle.js',
        './logic/logicdiv/23_hashi_ui.js',
        './logic/js/23_hashi.js',
        './logic/logicdiv/24_heteromino_ui.js',
        './logic/js/24_heteromino.js',
        './logic/logicdiv/25_heyawake_ui.js',
        './logic/js/25_heyawake.js',
        './logic/logicdiv/26_hitori_ui.js',
        './logic/js/26_hitori.js',
        './logic/logicdiv/27_hotaru_ui.js',
        './logic/js/27_hotaru.js',
        './logic/logicdiv/28_kakuro_ui.js',
        './logic/js/28_kakuro.js',
        './logic/logicdiv/29_kuromasu_ui.js',
        './logic/js/29_kuromasu.js',
        './logic/logicdiv/30_kurotto_ui.js',
        './logic/js/30_kurotto.js',
        './logic/logicdiv/31_lits_ui.js',
        './logic/js/31_lits.js',
        './logic/logicdiv/32_magnets_ui.js',
        './logic/js/32_magnets.js',
        './logic/logicdiv/33_masyu_ui.js',
        './logic/js/33_masyu.js',
        './logic/logicdiv/34_minesweeper_ui.js',
        './logic/js/34_minesweeper.js',
        './logic/logicdiv/35_moonsun_ui.js',
        './logic/js/35_moonsun.js',
        './logic/logicdiv/36_nagare_ui.js',
        './logic/js/36_nagare.js',
        './logic/logicdiv/37_nanro_ui.js',
        './logic/js/37_nanro.js',
        './logic/logicdiv/38_ncells_ui.js',
        './logic/js/38_ncells.js',
        './logic/logicdiv/39_nonogram_ui.js',
        './logic/js/39_nonogram.js',
        './logic/logicdiv/40_norinori_ui.js',
        './logic/js/40_norinori.js',
        './logic/logicdiv/41_numberlink_ui.js',
        './logic/js/41_numberlink.js',
        './logic/logicdiv/42_nuribou_ui.js',
        './logic/js/42_nuribou.js',
        './logic/logicdiv/43_nurikabe_ui.js',
        './logic/js/43_nurikabe.js',
        './logic/logicdiv/44_nurimisaki_ui.js',
        './logic/js/44_nurimisaki.js',
        './logic/logicdiv/45_onsen_ui.js',
        './logic/js/45_onsen.js',
    ];

    // ===== 第二批（46-63号谜题）=====
    const logicBatch2 = [
        './logic/logicdiv/46_rippleeffect_ui.js',
        './logic/js/46_rippleeffect.js',
        './logic/logicdiv/47_shakashaka_ui.js',
        './logic/js/47_shakashaka.js',
        './logic/logicdiv/48_shikaku_ui.js',
        './logic/js/48_shikaku.js',
        './logic/logicdiv/49_shimaguni_ui.js',
        './logic/js/49_shimaguni.js',
        './logic/logicdiv/50_skyscrapers_ui.js',
        './logic/js/50_skyscrapers.js',
        './logic/logicdiv/51_slitherlink_ui.js',
        './logic/js/51_slitherlink.js',
        './logic/logicdiv/52_spiralgalaxies_ui.js',
        './logic/js/52_spiralgalaxies.js',
        './logic/logicdiv/53_starbattle_ui.js',
        './logic/js/53_starbattle.js',
        './logic/logicdiv/54_statuepark_ui.js',
        './logic/js/54_statuepark.js',
        './logic/logicdiv/55_stostone_ui.js',
        './logic/js/55_stostone.js',
        './logic/logicdiv/56_tapa_ui.js',
        './logic/js/56_tapa.js',
        './logic/logicdiv/57_tatamibari_ui.js',
        './logic/js/57_tatamibari.js',
        './logic/logicdiv/58_tents_ui.js',
        './logic/js/58_tents.js',
        './logic/logicdiv/59_tll_ui.js',
        './logic/js/59_tll.js',
        './logic/logicdiv/60_tren_ui.js',
        './logic/js/60_tren.js',
        './logic/logicdiv/61_yajilin_ui.js',
        './logic/js/61_yajilin.js',
        './logic/logicdiv/62_yajisankazusan_ui.js',
        './logic/js/62_yajisankazusan.js',
        './logic/logicdiv/63_yinyang_ui.js',
        './logic/js/63_yinyang.js',
    ];

    // Batch1加载完 → 先渲染1-45号谜题，逻辑区立即可用
    loadBatch(logicBatch1).then(() => {
        if (typeof initLogicModule === 'function') initLogicModule();
    });
    // Batch2加载完 → 重新渲染，追加46-63号谜题
    loadBatch(logicBatch2).then(() => {
        if (typeof initLogicModule === 'function') initLogicModule();
    });
})();
