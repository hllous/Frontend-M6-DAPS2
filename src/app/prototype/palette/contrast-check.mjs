const palettes = {
  A: { theme: "#12315b", strong: "#1d4f82", canvas: "#f4f7fa", ink: "#172337", muted: "#536174", infoBg: "#e0eef8", infoFg: "#15537e", successBg: "#deefe7", successFg: "#1d6247", warningBg: "#f8e8cf", warningFg: "#7b480e", dangerBg: "#f7e1e2", dangerFg: "#96313c", focus: "#2377bd" },
  B: { theme: "#174d3c", strong: "#246a50", canvas: "#f4f2e9", ink: "#1b2f28", muted: "#58675f", infoBg: "#dcece6", infoFg: "#185741", successBg: "#e0edd8", successFg: "#315f2e", warningBg: "#f3e3c8", warningFg: "#77460f", dangerBg: "#f4dfda", dangerFg: "#913b2d", focus: "#21715a" },
  C: { theme: "#1d3d49", strong: "#087b82", canvas: "#eef3f4", ink: "#17282f", muted: "#52656c", infoBg: "#d7ecee", infoFg: "#075b62", successBg: "#dcece5", successFg: "#1c5e46", warningBg: "#f2e4cc", warningFg: "#74470f", dangerBg: "#f2dfe2", dangerFg: "#8b3340", focus: "#087b82" },
}

function luminance(hex) {
  const channels = hex.match(/\w\w/g).map((value) => parseInt(value, 16) / 255)
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

let failed = false
for (const [name, palette] of Object.entries(palettes)) {
  const pairs = {
    "theme/on-theme": [palette.theme, "#ffffff", 4.5],
    "action/on-theme": [palette.strong, "#ffffff", 4.5],
    "ink/canvas": [palette.ink, palette.canvas, 4.5],
    "muted/canvas": [palette.muted, palette.canvas, 4.5],
    "info status": [palette.infoFg, palette.infoBg, 4.5],
    "success status": [palette.successFg, palette.successBg, 4.5],
    "warning status": [palette.warningFg, palette.warningBg, 4.5],
    "danger status": [palette.dangerFg, palette.dangerBg, 4.5],
    "focus/canvas": [palette.focus, palette.canvas, 3],
  }

  for (const [role, [foreground, background, minimum]] of Object.entries(pairs)) {
    const ratio = contrast(foreground, background)
    if (ratio < minimum) failed = true
    console.log(`${name} ${role}: ${ratio.toFixed(2)}:1 ${ratio >= minimum ? "PASS" : "FAIL"}`)
  }
}

if (failed) process.exitCode = 1
