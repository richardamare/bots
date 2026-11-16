// Renders the Bots icon set from its SVG sources. macOS only: it rasterizes with `sips`.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

const join = NodePath.join;

const prod = join(import.meta.dirname, "..", "assets", "prod");
const scratch = NodeFS.mkdtempSync(join(NodeOS.tmpdir(), "bots-icons-"));

function render(svg: string, size: number, out: string) {
  NodeChildProcess.execFileSync(
    "sips",
    ["-s", "format", "png", "-z", `${size}`, `${size}`, svg, "--out", out],
    {
      stdio: "ignore",
    },
  );
}

function png(svg: string, size: number): Buffer {
  const out = join(scratch, `${size}.png`);
  render(svg, size, out);
  return NodeFS.readFileSync(out);
}

function ico(images: ReadonlyArray<{ size: number; data: Buffer }>): Buffer {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

const mac = join(prod, "bots-macos.svg");
const universal = join(prod, "bots-universal.svg");

render(mac, 1024, join(prod, "black-macos-1024.png"));
render(universal, 1024, join(prod, "black-universal-1024.png"));
render(universal, 1024, join(prod, "black-ios-1024.png"));
render(universal, 16, join(prod, "t3-black-web-favicon-16x16.png"));
render(universal, 32, join(prod, "t3-black-web-favicon-32x32.png"));
render(universal, 180, join(prod, "t3-black-web-apple-touch-180.png"));
render(universal, 192, join(prod, "t3-black-web-icon-192x192.png"));
render(universal, 512, join(prod, "t3-black-web-icon-512x512.png"));
NodeFS.writeFileSync(
  join(prod, "t3-black-web-favicon.ico"),
  ico([16, 32, 48].map((size) => ({ size, data: png(universal, size) }))),
);
NodeFS.writeFileSync(
  join(prod, "t3-black-windows.ico"),
  ico([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, data: png(universal, size) }))),
);
