export interface MarketPreset {
    name: string
    keywords: string[]
    rawPath: string
    type: 'main' | 'character'
    relativePath: string
    repositoryEndpoint: string
}



export type MarketPresets = MarketPreset[]
