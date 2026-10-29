Put a short Y4M clip with a clearly visible face at `face.y4m` to run `e2e/booth.spec.ts`.

    ffmpeg -i face.mp4 -t 8 -pix_fmt yuv420p -vf scale=640:480 face.y4m

The file is git-ignored; CI skips the booth spec when it is missing.
