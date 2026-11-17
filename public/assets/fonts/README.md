# Summon Vietnamese typography

`NotoSerif-Bold-Vietnamese.woff2` is a self-hosted, static bold (700), normal-width subset of Noto Serif. Source: https://github.com/google/fonts/tree/main/ofl/notoserif . License: SIL Open Font License 1.1, retained in `OFL-NotoSerif.txt`.

Derived with fontTools: instantiate wght=700 / wdth=100, subset U+0000?024F, U+0300?036F, U+1E00?1EFF, U+2000?206F, U+20AB and U+2192. Includes Vietnamese precomposed letters and combining marks. No external font request is needed at runtime. Phaser's font loader waits before creating the Summon scene labels. Other scenes retain their fonts.
