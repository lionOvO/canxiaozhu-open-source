from pathlib import Path


THEMES = [
    {
        "name": "Sakura Dream",
        "bg": ("#1c1333", "#6f2dbd", "#ff7aa2"),
        "glow": "#ffd6e7",
        "accent": "#ff89b4",
        "ring": "#ffd1ec",
        "petal": "#ffc1da",
        "mode": "girl",
    },
    {
        "name": "Neon Alley",
        "bg": ("#090b1f", "#1e3a8a", "#22d3ee"),
        "glow": "#7dd3fc",
        "accent": "#38bdf8",
        "ring": "#a5f3fc",
        "petal": "#93c5fd",
        "mode": "city",
    },
    {
        "name": "Moonlit Room",
        "bg": ("#111827", "#312e81", "#818cf8"),
        "glow": "#c4b5fd",
        "accent": "#a78bfa",
        "ring": "#ddd6fe",
        "petal": "#e9d5ff",
        "mode": "window",
    },
    {
        "name": "Pastel Cafe",
        "bg": ("#3b2a4f", "#f59e0b", "#fb7185"),
        "glow": "#fde68a",
        "accent": "#f9a8d4",
        "ring": "#fef3c7",
        "petal": "#fed7aa",
        "mode": "cafe",
    },
    {
        "name": "Forest Spirit",
        "bg": ("#0f172a", "#14532d", "#34d399"),
        "glow": "#86efac",
        "accent": "#4ade80",
        "ring": "#bbf7d0",
        "petal": "#dcfce7",
        "mode": "forest",
    },
    {
        "name": "Sky Sail",
        "bg": ("#0f172a", "#0ea5e9", "#67e8f9"),
        "glow": "#e0f2fe",
        "accent": "#38bdf8",
        "ring": "#cffafe",
        "petal": "#bae6fd",
        "mode": "sky",
    },
    {
        "name": "Cosmic Idol",
        "bg": ("#190b2c", "#7c3aed", "#f472b6"),
        "glow": "#f9a8d4",
        "accent": "#f472b6",
        "ring": "#fbcfe8",
        "petal": "#fecdd3",
        "mode": "idol",
    },
    {
        "name": "Snowlight",
        "bg": ("#0f172a", "#0f766e", "#99f6e4"),
        "glow": "#ccfbf1",
        "accent": "#5eead4",
        "ring": "#a7f3d0",
        "petal": "#f0fdfa",
        "mode": "winter",
    },
    {
        "name": "Sunset Track",
        "bg": ("#1e1b4b", "#fb7185", "#f59e0b"),
        "glow": "#fde68a",
        "accent": "#fdba74",
        "ring": "#fecaca",
        "petal": "#fecdd3",
        "mode": "sunset",
    },
    {
        "name": "Nebula Notes",
        "bg": ("#0f172a", "#4338ca", "#22c55e"),
        "glow": "#d9f99d",
        "accent": "#a3e635",
        "ring": "#bbf7d0",
        "petal": "#dbeafe",
        "mode": "music",
    },
    {
        "name": "Candy Night",
        "bg": ("#1f1147", "#db2777", "#f472b6"),
        "glow": "#fce7f3",
        "accent": "#f9a8d4",
        "ring": "#fbcfe8",
        "petal": "#f9a8d4",
        "mode": "soft",
    },
    {
        "name": "Aurora Field",
        "bg": ("#081526", "#2563eb", "#14b8a6"),
        "glow": "#67e8f9",
        "accent": "#22d3ee",
        "ring": "#93c5fd",
        "petal": "#cffafe",
        "mode": "aurora",
    },
]

SILHOUETTES = {
    "girl": """
    <g transform="translate(0,30)">
      <ellipse cx="500" cy="355" rx="102" ry="118" fill="rgba(255,233,224,0.94)"/>
      <path d="M405 342 C380 266, 423 180, 503 180 C587 180, 624 274, 596 347 C581 383, 556 408, 503 408 C451 408, 423 386, 405 342Z" fill="#22163d"/>
      <path d="M365 545 C394 456, 447 420, 503 420 C557 420, 611 455, 639 545 L660 780 C603 823, 540 846, 503 846 C464 846, 399 821, 338 780Z" fill="#1b1332"/>
      <path d="M436 447 C406 505, 396 571, 400 628 L352 709 C317 623, 316 533, 352 464Z" fill="#2a1d4b" opacity="0.96"/>
      <path d="M574 447 C604 505, 614 571, 610 628 L658 709 C693 623, 694 533, 658 464Z" fill="#2a1d4b" opacity="0.96"/>
      <path d="M440 848 C451 762, 470 705, 500 676 C530 705, 549 762, 560 848 L603 1080 C561 1107, 532 1119, 500 1119 C468 1119, 439 1107, 397 1080Z" fill="#140e26"/>
    </g>
    """,
    "city": """
    <g transform="translate(0,24)">
      <rect x="252" y="420" width="104" height="470" rx="18" fill="#0c1020"/>
      <rect x="376" y="332" width="114" height="558" rx="20" fill="#121831"/>
      <rect x="512" y="388" width="108" height="502" rx="20" fill="#0b1127"/>
      <rect x="648" y="450" width="82" height="440" rx="16" fill="#18213c"/>
      <rect x="430" y="190" width="62" height="106" rx="20" fill="#ff4fd8" opacity="0.82"/>
      <path d="M266 914 L734 914 L785 1006 L215 1006Z" fill="#090d18"/>
      <circle cx="500" cy="355" r="90" fill="#0ea5e9" opacity="0.16"/>
      <circle cx="500" cy="355" r="58" fill="#67e8f9" opacity="0.22"/>
    </g>
    """,
    "window": """
    <g transform="translate(0,10)">
      <rect x="302" y="240" width="356" height="462" rx="34" fill="#15192c" opacity="0.92"/>
      <rect x="332" y="272" width="296" height="398" rx="24" fill="#24324e"/>
      <circle cx="450" cy="390" r="92" fill="#f9c9b6" opacity="0.95"/>
      <path d="M382 366 C388 277, 447 220, 520 220 C592 220, 629 273, 629 353 C629 425, 599 462, 561 495 C557 466, 528 454, 492 454 C446 454, 421 469, 419 500 C392 472, 382 424, 382 366Z" fill="#22163d"/>
      <rect x="368" y="704" width="264" height="170" rx="28" fill="#131828"/>
    </g>
    """,
    "cafe": """
    <g transform="translate(0,26)">
      <path d="M240 804 C308 692, 397 640, 500 640 C603 640, 692 692, 760 804 L780 974 L220 974Z" fill="#1c1433"/>
      <rect x="312" y="338" width="376" height="338" rx="38" fill="#f3e8ff" opacity="0.18"/>
      <rect x="350" y="364" width="300" height="226" rx="28" fill="#ffd3b4" opacity="0.94"/>
      <circle cx="500" cy="394" r="78" fill="#f9d5c0"/>
      <path d="M414 376 C428 300, 470 258, 523 258 C579 258, 628 299, 635 372 C642 444, 611 503, 589 520 C575 501, 553 490, 520 490 C477 490, 447 506, 430 526 C419 505, 410 444, 414 376Z" fill="#2b163f"/>
      <path d="M470 516 C479 576, 521 604, 565 620 L547 748 L453 748 L437 620 C455 600, 464 559, 470 516Z" fill="#241436"/>
    </g>
    """,
    "forest": """
    <g transform="translate(0,18)">
      <circle cx="500" cy="334" r="126" fill="#bbf7d0" opacity="0.14"/>
      <path d="M210 858 C284 701, 356 626, 500 626 C644 626, 716 701, 790 858 L790 1000 L210 1000Z" fill="#08111e"/>
      <path d="M328 714 L404 562 L476 714Z" fill="#14532d"/>
      <path d="M424 714 L500 520 L576 714Z" fill="#166534"/>
      <path d="M524 714 L596 562 L672 714Z" fill="#14532d"/>
      <circle cx="500" cy="404" r="70" fill="#e7f9ee" opacity="0.92"/>
      <path d="M448 404 C437 344, 473 302, 523 302 C574 302, 605 344, 602 401 C600 445, 577 472, 545 486 C536 463, 520 452, 499 452 C474 452, 458 464, 448 486 C442 462, 444 434, 448 404Z" fill="#16263f"/>
    </g>
    """,
    "sky": """
    <g transform="translate(0,20)">
      <path d="M198 760 C300 642, 397 587, 500 587 C603 587, 700 642, 802 760 L802 1004 L198 1004Z" fill="#0b1324"/>
      <path d="M286 700 C342 646, 402 620, 500 620 C598 620, 658 646, 714 700 C638 780, 575 810, 500 810 C425 810, 362 780, 286 700Z" fill="#dff6ff" opacity="0.16"/>
      <circle cx="500" cy="314" r="88" fill="#e0f2fe" opacity="0.32"/>
      <path d="M441 416 C437 360, 476 323, 527 323 C579 323, 616 360, 612 414 C609 455, 581 480, 547 494 C542 473, 521 460, 499 460 C476 460, 456 472, 441 494 C433 476, 438 444, 441 416Z" fill="#223050"/>
    </g>
    """,
    "idol": """
    <g transform="translate(0,14)">
      <rect x="222" y="208" width="516" height="544" rx="42" fill="#210d3b" opacity="0.84"/>
      <circle cx="500" cy="390" r="88" fill="#ffd6e7"/>
      <path d="M400 365 C397 287, 442 222, 507 222 C588 222, 631 287, 627 365 C625 407, 603 456, 590 486 C574 468, 548 456, 519 456 C472 456, 444 473, 425 491 C414 462, 402 418, 400 365Z" fill="#241338"/>
      <path d="M355 548 C400 481, 447 448, 500 448 C553 448, 601 481, 646 548 L686 914 L314 914Z" fill="#140b25"/>
      <circle cx="500" cy="248" r="16" fill="#fce7f3" opacity="0.64"/>
    </g>
    """,
    "winter": """
    <g transform="translate(0,18)">
      <path d="M200 842 C286 718, 379 652, 500 652 C621 652, 714 718, 800 842 L800 1008 L200 1008Z" fill="#06101e"/>
      <circle cx="500" cy="356" r="106" fill="#cffafe" opacity="0.78"/>
      <path d="M420 340 C424 266, 468 220, 521 220 C575 220, 623 266, 628 341 C632 402, 608 458, 589 482 C573 466, 548 454, 518 454 C480 454, 453 466, 431 487 C423 463, 418 405, 420 340Z" fill="#17223d"/>
      <path d="M378 646 C408 574, 450 538, 500 538 C550 538, 592 574, 622 646 L646 1024 L354 1024Z" fill="#0f1a2d"/>
    </g>
    """,
    "sunset": """
    <g transform="translate(0,20)">
      <circle cx="500" cy="344" r="122" fill="#fde68a" opacity="0.24"/>
      <circle cx="500" cy="344" r="76" fill="#fff1b8" opacity="0.84"/>
      <path d="M196 812 C306 670, 398 604, 500 604 C602 604, 694 670, 804 812 L804 1012 L196 1012Z" fill="#111127"/>
      <path d="M352 580 C392 514, 443 478, 500 478 C558 478, 609 514, 648 580 L672 1012 L328 1012Z" fill="#1f1236"/>
      <path d="M430 490 C418 418, 460 365, 520 365 C582 365, 628 418, 620 492 C615 541, 591 576, 562 596 C547 575, 523 562, 498 562 C471 562, 448 573, 430 594 C422 568, 427 525, 430 490Z" fill="#261742"/>
    </g>
    """,
    "music": """
    <g transform="translate(0,22)">
      <path d="M210 848 C302 707, 396 648, 500 648 C604 648, 698 707, 790 848 L790 1010 L210 1010Z" fill="#0b1120"/>
      <path d="M326 338 L420 308 L444 410 L350 440Z" fill="#a3e635" opacity="0.6"/>
      <path d="M580 306 L680 338 L654 440 L556 410Z" fill="#22d3ee" opacity="0.6"/>
      <circle cx="500" cy="366" r="86" fill="#dbeafe" opacity="0.9"/>
      <path d="M401 360 C402 290, 446 228, 506 228 C586 228, 629 290, 623 360 C620 400, 601 446, 584 470 C567 454, 546 444, 520 444 C477 444, 447 457, 429 477 C417 451, 401 408, 401 360Z" fill="#241338"/>
      <path d="M372 608 C403 550, 449 520, 500 520 C552 520, 598 550, 628 608 L655 1010 L345 1010Z" fill="#131a2d"/>
    </g>
    """,
    "soft": """
    <g transform="translate(0,20)">
      <ellipse cx="500" cy="366" rx="108" ry="122" fill="#ffd7e5"/>
      <path d="M407 354 C394 280, 442 218, 510 218 C584 218, 630 281, 624 354 C619 414, 591 449, 565 470 C556 447, 531 435, 501 435 C463 435, 438 447, 419 474 C411 450, 404 404, 407 354Z" fill="#241338"/>
      <path d="M362 554 C395 486, 446 450, 500 450 C554 450, 606 486, 638 554 L666 1014 L334 1014Z" fill="#110f22"/>
      <circle cx="500" cy="286" r="24" fill="#fff1f2" opacity="0.6"/>
    </g>
    """,
    "aurora": """
    <g transform="translate(0,24)">
      <path d="M220 854 C298 728, 389 664, 500 664 C611 664, 702 728, 780 854 L780 1008 L220 1008Z" fill="#08111d"/>
      <circle cx="500" cy="330" r="116" fill="#67e8f9" opacity="0.14"/>
      <path d="M430 338 C438 266, 477 218, 536 218 C595 218, 635 267, 641 338 C646 398, 623 450, 602 477 C590 455, 571 445, 548 445 C492 445, 466 463, 447 482 C435 455, 426 407, 430 338Z" fill="#1b2640"/>
      <path d="M354 624 C400 548, 448 516, 500 516 C552 516, 600 548, 646 624 L690 1010 L310 1010Z" fill="#0f182b"/>
    </g>
    """,
}


def build_svg(theme: dict, index: int) -> str:
    bg1, bg2, bg3 = theme["bg"]
    mode = theme["mode"]
    silhouette = SILHOUETTES[mode]
    petal = theme["petal"]
    glow = theme["glow"]
    accent = theme["accent"]
    ring = theme["ring"]

    spark_points = [
        (126, 140, 3, 0.55),
        (198, 220, 2, 0.65),
        (784, 160, 3, 0.55),
        (836, 238, 2, 0.60),
        (730, 124, 2, 0.70),
        (164, 840, 4, 0.28),
        (758, 826, 4, 0.28),
        (500, 126, 2, 0.45),
        (468, 196, 2, 0.35),
        (536, 210, 3, 0.32),
    ]
    spark_bits = "".join(
        f'<circle cx="{x}" cy="{y}" r="{r}" fill="{glow}" opacity="{a}"/>'
        for x, y, r, a in spark_points
    )

    diamond_points = [
        (146, 184),
        (824, 180),
        (172, 770),
        (796, 760),
        (500, 164),
    ]
    diamond_bits = "".join(
        f'<path d="M{x} {y - 12} L{x + 4} {y} L{x} {y + 12} L{x - 4} {y}Z" fill="{accent}" opacity="0.50"/>'
        for x, y in diamond_points
    )

    petal_bits = f"""
  <g opacity="0.74">
    <ellipse cx="164" cy="214" rx="24" ry="10" fill="{petal}" transform="rotate(-28 164 214)"/>
    <ellipse cx="208" cy="330" rx="26" ry="11" fill="{petal}" transform="rotate(18 208 330)"/>
    <ellipse cx="760" cy="198" rx="22" ry="9" fill="{petal}" transform="rotate(26 760 198)"/>
    <ellipse cx="786" cy="380" rx="24" ry="10" fill="{petal}" transform="rotate(-22 786 380)"/>
    <ellipse cx="208" cy="896" rx="24" ry="10" fill="{petal}" transform="rotate(16 208 896)"/>
    <ellipse cx="742" cy="880" rx="22" ry="9" fill="{petal}" transform="rotate(-14 742 880)"/>
  </g>
"""

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 1280" role="img" aria-label="{theme["name"]} anime illustration">
  <defs>
    <linearGradient id="bg-{index}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg1}"/>
      <stop offset="55%" stop-color="{bg2}"/>
      <stop offset="100%" stop-color="{bg3}"/>
    </linearGradient>
    <radialGradient id="g-{index}" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="{glow}" stop-opacity="0.42"/>
      <stop offset="60%" stop-color="{glow}" stop-opacity="0.11"/>
      <stop offset="100%" stop-color="{glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="veil-{index}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.16)"/>
    </linearGradient>
  </defs>
  <rect width="960" height="1280" fill="url(#bg-{index})"/>
  <rect width="960" height="1280" fill="url(#g-{index})"/>
  <circle cx="180" cy="214" r="110" fill="{ring}" opacity="0.10"/>
  <circle cx="776" cy="264" r="142" fill="{ring}" opacity="0.08"/>
  <circle cx="682" cy="946" r="156" fill="{ring}" opacity="0.06"/>
  {spark_bits}
  {diamond_bits}
  {petal_bits}
  <g opacity="0.98">{silhouette}</g>
  <rect width="960" height="1280" fill="url(#veil-{index})"/>
</svg>
'''


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    asset_dir = next(root.glob("**/front-end/public/local-assets"))
    files = sorted(asset_dir.glob("manchan-local-*.svg"))
    if not files:
      raise SystemExit(f"no svg assets found in {asset_dir}")

    for idx, file in enumerate(files):
        theme = THEMES[idx % len(THEMES)]
        file.write_text(build_svg(theme, idx), encoding="utf-8")

    print(f"updated {len(files)} svg assets in {asset_dir}")


if __name__ == "__main__":
    main()
