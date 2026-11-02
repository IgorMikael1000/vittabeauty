"use client";

import { useState } from "react";
import { CirclePlay, MoveUpRight, Play } from "lucide-react";
import styles from "./product-video-showcase.module.css";

const videos = [
  {
    id: "Ld4Sd1AR3LQ",
    title: "Conheça o painel",
    description: "Uma visão geral do seu espaço profissional.",
    label: "VISÃO GERAL",
  },
  {
    id: "F3L5EToJVfs",
    title: "Cadastre seus serviços",
    description: "Organize seus procedimentos e informações.",
    label: "SEUS SERVIÇOS",
  },
  {
    id: "hJbpRZIpDaU",
    title: "Configure sua agenda",
    description: "Ajuste horários de funcionamento e disponibilidade.",
    label: "SUA DISPONIBILIDADE",
  },
  {
    id: "tU42MCeKhMs",
    title: "Compartilhe seu link",
    description: "Veja a experiência de agendamento da cliente.",
    label: "AGENDAMENTO ONLINE",
  },
  {
    id: "lQy-85r_U7E",
    title: "Acompanhe solicitações",
    description: "Confira a confirmação de um agendamento com sinal manual.",
    label: "CONFIRMAÇÃO",
  },
  {
    id: "x-QT-Tr61Jg",
    title: "Veja seu financeiro",
    description: "Conheça a área de controle financeiro do Vitta.",
    label: "FINANCEIRO",
  },
];

export function ProductVideoShowcase() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const activeVideo = videos[activeVideoIndex];

  function selectVideo(index: number) {
    setActiveVideoIndex(index);
    setHasStarted(false);
  }

  return (
    <div className={styles.showcase}>
      <div className={styles.deviceColumn}>
        <div className={styles.videoBackdrop} />
        <div className={styles.deviceFrame}>
          <div className={styles.deviceCamera} />
          <div
            aria-label={`Demonstração: ${activeVideo.title}`}
            className={styles.videoContent}
            id="vitta-product-video"
          >
            {hasStarted ? (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className={styles.video}
                key={activeVideo.id}
                referrerPolicy="strict-origin-when-cross-origin"
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?playsinline=1&rel=0&autoplay=1`}
                title={`Demonstração Vitta Beauty: ${activeVideo.title}`}
              />
            ) : (
              <div
                aria-label={`Prévia de ${activeVideo.title}`}
                className={styles.videoPoster}
                role="img"
                style={{
                  backgroundImage: `url("https://i.ytimg.com/vi/${activeVideo.id}/hq2.jpg")`,
                }}
              >
                <button
                  aria-label={`Assistir: ${activeVideo.title}`}
                  className={styles.playButton}
                  onClick={() => setHasStarted(true)}
                  type="button"
                >
                  <Play aria-hidden="true" fill="currentColor" size={23} />
                </button>
                <span className={styles.posterCaption}>Gravação real do Vitta Beauty</span>
              </div>
            )}
          </div>
        </div>
        <div className={styles.videoCaption}>
          <CirclePlay aria-hidden="true" size={16} />
          <span>
            <strong>{activeVideo.label}</strong>
            <small>Gravação real do aplicativo</small>
          </span>
        </div>
      </div>

      <div className={styles.videoChoices}>
        <div className={styles.choiceIntro}>
          <span className={styles.choiceEyebrow}>ESCOLHA UMA ETAPA</span>
          <p>Toque para assistir à demonstração.</p>
        </div>
        <div
          aria-label="Demonstrações do Vitta Beauty"
          className={styles.videoList}
          role="group"
        >
          {videos.map((video, index) => {
            const isActive = index === activeVideoIndex;

            return (
              <button
                aria-controls="vitta-product-video"
                aria-pressed={isActive}
                className={`${styles.videoChoice} ${isActive ? styles.videoChoiceActive : ""}`}
                id={`vitta-video-tab-${index}`}
                key={video.id}
                onClick={() => selectVideo(index)}
                type="button"
              >
                <span className={styles.choiceNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.choiceText}>
                  <strong>{video.title}</strong>
                  <small>{video.description}</small>
                </span>
                <MoveUpRight aria-hidden="true" className={styles.choiceArrow} size={16} />
              </button>
            );
          })}
        </div>
        <p className={styles.videoNote}>
          Escolha uma etapa e toque em play para assistir dentro do celular.
        </p>
        <a
          className={styles.youtubeLink}
          href={`https://www.youtube.com/shorts/${activeVideo.id}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          Abrir este vídeo no YouTube <MoveUpRight aria-hidden="true" size={13} />
        </a>
      </div>
    </div>
  );
}
