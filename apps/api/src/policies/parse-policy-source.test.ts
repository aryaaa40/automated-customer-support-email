import { describe, expect, it } from "vitest";
import { parsePolicySource } from "./parse-policy-source";

const FRONTMATTER = `---
code: KBJ-01
title: Kebijakan Refund & Pengembalian
version: 3.0
status: aktif
effectiveDate: 2026-08-01
owner: Divisi Customer Service
---
`;

describe("parsePolicySource", () => {
  it("membaca metadata, bab, pasal, dan paragraf", () => {
    const source = `${FRONTMATTER}
## BAB 1 Ketentuan Umum

### Pasal 1.1 Tujuan

Kebijakan ini mengatur pengembalian dana.
Baris kedua masih paragraf yang sama.

Ini paragraf baru.
`;

    expect(parsePolicySource(source)).toEqual({
      code: "KBJ-01",
      title: "Kebijakan Refund & Pengembalian",
      version: "3.0",
      status: "aktif",
      effectiveDate: "2026-08-01",
      owner: "Divisi Customer Service",
      chapters: [
        {
          number: 1,
          title: "Ketentuan Umum",
          articles: [
            {
              number: "1.1",
              title: "Tujuan",
              blocks: [
                { kind: "paragraph", text: "Kebijakan ini mengatur pengembalian dana. Baris kedua masih paragraf yang sama." },
                { kind: "paragraph", text: "Ini paragraf baru." },
              ],
            },
          ],
        },
      ],
    });
  });

  it("membaca daftar, tabel, dan catatan", () => {
    const source = `${FRONTMATTER}
## BAB 1 Masa Garansi

### Pasal 1.1 Masa Garansi per Kategori

| Kategori Produk | Masa Garansi |
|---|---|
| Elektronik | 365 hari |
| Fashion | 30 hari |

- Kartu garansi asli
- Bukti pembelian

> Pengecualian: kerusakan akibat
> pemakaian yang salah.
`;

    expect(parsePolicySource(source).chapters[0]?.articles[0]?.blocks).toEqual([
      {
        kind: "table",
        header: ["Kategori Produk", "Masa Garansi"],
        rows: [
          ["Elektronik", "365 hari"],
          ["Fashion", "30 hari"],
        ],
      },
      { kind: "list", items: ["Kartu garansi asli", "Bukti pembelian"] },
      { kind: "note", text: "Pengecualian: kerusakan akibat pemakaian yang salah." },
    ]);
  });

  it.each([
    ["BAB melompat", "## BAB 1 A\n### Pasal 1.1 X\nIsi.\n## BAB 3 C\n### Pasal 3.1 Y\nIsi.", /BAB 3 seharusnya BAB 2/],
    ["pasal melompat", "## BAB 1 A\n### Pasal 1.1 X\nIsi.\n### Pasal 1.3 Y\nIsi.", /Pasal 1.3 seharusnya Pasal 1.2/],
    ["pasal di bab yang salah", "## BAB 1 A\n### Pasal 1.1 X\nIsi.\n## BAB 2 B\n### Pasal 1.2 Y\nIsi.", /Pasal 1.2 seharusnya Pasal 2.1/],
    ["isi sebelum pasal", "## BAB 1 A\nIsi tanpa pasal.", /sebelum pasal pertamanya/],
    ["pasal kosong", "## BAB 1 A\n### Pasal 1.1 X\n", /Pasal 1.1 kosong/],
    ["kolom tabel tidak sama", "## BAB 1 A\n### Pasal 1.1 X\n| a | b |\n|---|---|\n| 1 |", /1 kolom, judulnya 2/],
  ])("menolak %s", (_case, body, error) => {
    expect(() => parsePolicySource(`${FRONTMATTER}\n${body}`)).toThrow(error);
  });

  it("menolak status di luar aktif / tidak_berlaku", () => {
    const source = FRONTMATTER.replace("status: aktif", "status: draft") + "## BAB 1 A\n### Pasal 1.1 X\nIsi.";
    expect(() => parsePolicySource(source)).toThrow();
  });
});
