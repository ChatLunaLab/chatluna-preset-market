import { Context, Schema } from 'koishi'

import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'

export function apply(ctx: Context, config: Config) {
    ctx.on('ready', async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        ;(await require('koishi-plugin-chatluna-preset-market/commands')).apply(
            ctx,
            config
        )
    })
}

export interface Config extends ChatLunaPlugin.Config {
    repositoryUrlEndPoint: string
}

export const Config = Schema.intersect([
    Schema.object({
        repositoryUrlEndPoint: Schema.string()
            .description('预设市场的接入点')
            .default(
                'https://raw.githubusercontent.com/ChatHubLab/awesome-chathub-presets'
            )
    }).description('请求配置')
]) as Schema<Config>

export const inject = ['chatluna']
