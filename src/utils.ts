import { MarketPreset, MarketPresets } from "./types";

export function mergeMarketPresets(markets: MarketPresets[]): MarketPresets {
    const mergedMarkets: MarketPresets = [];
    const presetMap = new Map<string, MarketPreset>();

    for (const market of markets) {
        for (const preset of market) {
            // 将关键词转换为字符串形式作为键
            const keywordString = preset.keywords.join(",");

            // 如果 Map 中不存在相同的关键词组合，则添加到 Map 和 mergedMarkets
            if (!presetMap.has(keywordString)) {
                presetMap.set(keywordString, preset);
                mergedMarkets.push(preset);
            }
        }
    }

    return mergedMarkets;
}
