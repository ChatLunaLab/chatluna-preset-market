import { Context, Schema } from 'koishi'

import { ChatHubPlugin } from "@dingyi222666/koishi-plugin-chathub/lib/services/chat"

class PresetMarketPlugin extends ChatHubPlugin<PresetMarketPlugin.Config> {
    name = '@dingyi222666/chathub-preset-market'

    public constructor(protected ctx: Context, public readonly config: PresetMarketPlugin.Config) {
        super(ctx, config)

        setTimeout(async () => {
            await require('./commands').apply(ctx, config)
        })
    }

}

namespace PresetMarketPlugin {
    export interface Config extends ChatHubPlugin.Config {
        repositoryUrlEndPoint: string
    }

    export const Config = Schema.intersect([
        Schema.object({
            repositoryUrlEndPoint: Schema.string().description('预设市场的接入点').default("https://raw.githubusercontent.com/ChatHubLab/awesome-chathub-presets"),
        }).description('请求配置'),
    ]) as Schema<PresetMarketPlugin.Config>


    export const using = ['chathub']
}

export default PresetMarketPlugin
