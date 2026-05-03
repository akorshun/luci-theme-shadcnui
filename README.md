# luci-theme-shadcnui

A LuCI theme for OpenWrt 25.12+ that ports the shadcn/ui visual language —
CSS variables, neutral palettes, accessible components — to the LuCI markup
that already ships on every router. Layout follows the familiar Argon shape:
a left sidebar with the menu tree, a sticky topbar with breadcrumbs and a
logout action, and a content area in the middle.

> **Status:** early. Targets OpenWrt 25.12.x with ucode templates and `apk`.
> Older LuCI versions using Lua templates are out of scope.

## Repository layout

```
luci-theme-shadcnui/         # the theme itself (PKGARCH=all)
luci-app-shadcnui-config/    # configuration UI exposed under System → Theme
.github/workflows/release.yml
```

## Features

- **Five neutral palettes** (zinc, slate, stone, gray, neutral) selectable from
  the config page; `zinc` matches `ui.shadcn.com` defaults.
- **Light / dark / system** mode. System mode follows `prefers-color-scheme`
  live, no reload needed.
- **Accent color override** via a real color picker; the picked hex is
  converted to the HSL-triple format that shadcn tokens expect.
- **Border-radius slider** that updates `--radius` across the theme.
- **Login backgrounds** from five sources: Bing daily, custom URL, local
  upload, Unsplash random, Wallhaven random. Per-source configuration with
  API keys stored in UCI (masked when read back).
- **Sidebar** with collapsed / expanded / mobile-drawer states, expanding the
  active section automatically.
- LuCI form widgets, tables, alerts, badges and the login card are all
  reskinned to match shadcn/ui idioms.

## Install (manual)

Grab the latest `.apk` files from the
[Releases](../../releases) page and copy them to your router:

```sh
# from your workstation
scp luci-theme-shadcnui_*.apk \
    luci-app-shadcnui-config_*.apk \
    root@192.168.17.1:/tmp/

# on the router
ssh root@192.168.17.1
apk add /tmp/luci-theme-shadcnui_*.apk
apk add /tmp/luci-app-shadcnui-config_*.apk
```

Then in LuCI: **System → System → Language and Style → Theme → shadcnui**,
or run:

```sh
uci set luci.main.mediaurlbase=/luci-static/shadcnui
uci commit luci
```

The configuration page lives at **System → Theme**.

## Build (locally, optional)

The same job runs in CI, but you can reproduce it locally with the OpenWrt
SDK:

```sh
# grab the SDK matching your firmware
wget https://downloads.openwrt.org/releases/25.12.2/targets/rockchip/armv8/openwrt-sdk-25.12.2-rockchip-armv8_gcc-14.3.0_musl.Linux-x86_64.tar.zst
tar --use-compress-program=unzstd -xf openwrt-sdk-*.tar.zst
cd openwrt-sdk-*

# stage packages
mkdir -p package/luci-theme-shadcnui package/luci-app-shadcnui-config
cp -a /path/to/repo/luci-theme-shadcnui/.       package/luci-theme-shadcnui/
cp -a /path/to/repo/luci-app-shadcnui-config/.  package/luci-app-shadcnui-config/

./scripts/feeds update -a
./scripts/feeds install -a

make defconfig
echo 'CONFIG_PACKAGE_luci-theme-shadcnui=m'      >> .config
echo 'CONFIG_PACKAGE_luci-app-shadcnui-config=m' >> .config
make defconfig

make package/luci-theme-shadcnui/compile      V=s -j$(nproc)
make package/luci-app-shadcnui-config/compile V=s -j$(nproc)

find bin -name '*.apk'
```

## Releasing

Push a `v*` tag. CI builds both packages with the OpenWrt 25.12.2 SDK and
attaches the resulting `.apk` artifacts to a GitHub release:

```sh
git tag -a v0.1.0 -m 'first release'
git push origin v0.1.0
```

## How it works

`luci-theme-shadcnui` provides three ucode templates under
`ucode/template/themes/shadcnui/`:

- `header.ut` — reads `/etc/config/shadcnui` via `uci.cursor()`, renders
  `<html data-base data-mode data-theme style="--primary:…">`, walks the
  dispatcher menu tree and produces the sidebar.
- `footer.ut` — closes the layout.
- `sysauth.ut` — login card; the background image is set via the
  `--login-bg` custom property assigned on `<html>`.

`luci-app-shadcnui-config` provides:

- A LuCI view (`view/shadcnui/config.js`) using `require('view')`,
  `require('rpc')`, `require('fs')` — the standard LuCI-2 client API.
- An ACL granting access to `uci.shadcnui`, the background folder, and the
  `luci.shadcnui` ubus object.
- A shell-based RPC handler at `/usr/libexec/rpcd/luci.shadcnui` that wraps
  Bing, Unsplash, and Wallhaven server-side (avoids browser CORS).

## Credits

Visual language: [shadcn/ui](https://ui.shadcn.com/) by @shadcn.
Layout inspiration: [luci-theme-argon](https://github.com/jerrykuku/luci-theme-argon) by @jerrykuku.

## License

Apache-2.0.
