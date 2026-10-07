/**
 * Nyan Clash 作者自己的链接。留空的项不会在界面上显示。
 * 发布前请至少填写 repo：GPL-3.0 要求分发安装包时同时提供源代码。
 */
export const NYAN_LINKS = {
  /** 公开源码仓库，如 https://github.com/你的用户名/nyan-clash */
  repo: '',
  /** B 站个人空间，如 https://space.bilibili.com/你的UID */
  bilibili: '',
  /** 打赏页面，如爱发电 https://afdian.com/a/你的ID */
  donate: ''
}

export const NYAN_CREDITS: { name: string; url: string; license: string; role: string }[] = [
  {
    name: 'Mihomo Party',
    url: 'https://github.com/mihomo-party-org/mihomo-party',
    license: 'GPL-3.0',
    role: 'nyan.about.credit.base'
  },
  {
    name: 'Mihomo',
    url: 'https://github.com/MetaCubeX/mihomo',
    license: 'GPL-3.0',
    role: 'nyan.about.credit.core'
  },
  {
    name: 'Sub-Store',
    url: 'https://github.com/sub-store-org/Sub-Store',
    license: 'GPL-3.0',
    role: 'nyan.about.credit.substore'
  },
  {
    name: 'Electron · React · HeroUI',
    url: 'https://www.electronjs.org',
    license: 'MIT',
    role: 'nyan.about.credit.framework'
  }
]
