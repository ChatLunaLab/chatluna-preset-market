import { Context, Schema } from 'koishi'

import { ChatHubPlugin } from "@dingyi222666/koishi-plugin-chathub/lib/services/chat"

export function apply(ctx: Context, config: Config) {
    setTimeout(async () => {
        await require('./commands').apply(ctx, config)
    })
}
export interface Config extends ChatHubPlugin.Config {
    repositoryUrlEndPoint: string
}

export const Config = Schema.intersect([
    Schema.object({
        repositoryUrlEndPoint: Schema.string().description('预设市场的接入点').default("https://raw.githubusercontent.com/ChatHubLab/awesome-chathub-presets"),
    }).description('请求配置'),
]) as Schema<Config>


export const using = ['chathub']

