# -*- coding: utf-8 -*-
"""
PASO 3 - Versiones optimizadas para insertar en una pagina web.

Genera, a partir del master:
  web_1080p.mp4   H.264 alto  (compatibilidad universal)
  web_720p.mp4    H.264 ligero (moviles / conexiones lentas)
  web_1080p.webm  VP9 (mejor compresion en navegadores modernos)
  poster.jpg      fotograma de portada
  embed.html      fragmento listo para pegar
"""
import os
import subprocess
import imageio_ffmpeg
import comun as C

FF = imageio_ffmpeg.get_ffmpeg_exe()
MASTER = os.path.join(C.SALIDA, "cafe_cereza_a_molido_30s_1080p.mp4")
WEB = os.path.join(C.SALIDA, "web")

COMUNES = ["-movflags", "+faststart", "-pix_fmt", "yuv420p", "-an",
           "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]

# El grano filmico del master dispara el bitrate en H.264/VP9. Un denoise muy
# suave lo atenua sin tocar la textura del cafe y reduce el peso ~4x.
SUAVE = "hqdn3d=1.5:1.5:4:4"


def corre(args):
    subprocess.run([FF, "-y", "-hide_banner", "-loglevel", "error"] + args, check=True)


def mb(p):
    return os.path.getsize(p) / 1048576.0


def main():
    os.makedirs(WEB, exist_ok=True)
    if not os.path.exists(MASTER):
        raise SystemExit("Falta el master: %s" % MASTER)

    # CRF verificado a 100 % de zoom: 29 conserva la textura del grano sin bloques
    d = os.path.join(WEB, "cafe_proceso_30s_1080p.mp4")
    corre(["-i", MASTER, "-vf", SUAVE, "-c:v", "libx264", "-preset", "slow",
           "-crf", "29", "-profile:v", "high", "-level", "4.0",
           "-g", "60"] + COMUNES + [d])
    print("1080p mp4  %6.2f MB" % mb(d))

    d7 = os.path.join(WEB, "cafe_proceso_30s_720p.mp4")
    corre(["-i", MASTER, "-vf", SUAVE + ",scale=1280:720:flags=lanczos",
           "-c:v", "libx264", "-preset", "slow", "-crf", "28",
           "-profile:v", "main", "-level", "3.1", "-g", "60"] + COMUNES + [d7])
    print("720p  mp4  %6.2f MB" % mb(d7))

    dw = os.path.join(WEB, "cafe_proceso_30s_1080p.webm")
    corre(["-i", MASTER, "-vf", SUAVE, "-c:v", "libvpx-vp9", "-crf", "40",
           "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2",
           "-g", "60", "-pix_fmt", "yuv420p", "-an", dw])
    print("1080p webm %6.2f MB" % mb(dw))

    dp = os.path.join(WEB, "poster.jpg")
    corre(["-ss", "2.2", "-i", MASTER, "-frames:v", "1", "-q:v", "3", dp])
    print("poster     %6.2f MB" % mb(dp))

    html = """<!-- Del cafe en cereza al cafe molido - 30 s, 16:9 -->
<video
  class="cafe-proceso"
  width="1920" height="1080"
  poster="poster.jpg"
  autoplay muted loop playsinline preload="metadata">
  <source src="cafe_proceso_30s_1080p.webm" type="video/webm">
  <source src="cafe_proceso_30s_1080p.mp4"  type="video/mp4">
  <source src="cafe_proceso_30s_720p.mp4"   type="video/mp4">
  Tu navegador no puede reproducir este video.
</video>

<style>
  .cafe-proceso { width: 100%; height: auto; display: block; }
</style>
"""
    with open(os.path.join(WEB, "embed.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("embed.html listo ->", WEB)


if __name__ == "__main__":
    main()
