"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { updateProfileImageAction } from "@/app/actions/account";

const maximumImageSize = 50 * 1024;
const imageDimension = 256;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível abrir esta imagem."));
    };
    image.src = objectUrl;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível comprimir a imagem."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Não foi possível preparar a imagem."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.");
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = imageDimension;
  canvas.height = imageDimension;

  const scale = Math.max(
    imageDimension / image.naturalWidth,
    imageDimension / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Seu navegador não conseguiu processar a imagem.");
  }

  context.drawImage(
    image,
    (imageDimension - width) / 2,
    (imageDimension - height) / 2,
    width,
    height,
  );

  for (const quality of [0.7, 0.6, 0.5, 0.4]) {
    const blob = await canvasToWebp(canvas, quality);
    if (blob.size <= maximumImageSize) return blob;
  }

  throw new Error(
    "A imagem ainda ficou maior que 50 KB após a compressão. Escolha outra imagem.",
  );
}

export function ProfileImageUpload({
  logoUrl,
  name,
}: {
  logoUrl: string | null;
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("");

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const image = await compressImage(file);
      const result = await updateProfileImageAction(
        await blobToDataUrl(image),
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(result.success ?? "Foto de perfil atualizada.");
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível atualizar a foto de perfil.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <input
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
      <button
        aria-label={
          pending
            ? "Processando foto de perfil"
            : `Alterar foto de perfil de ${name}`
        }
        className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-[#eedbee] to-[#f7e7ef] text-2xl font-semibold tracking-tight text-[#714992] shadow-[0_8px_24px_rgba(66,47,78,0.12)] disabled:cursor-wait"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {logoUrl ? (
          <Image
            alt={`Foto de perfil de ${name}`}
            className="object-cover"
            height={96}
            priority
            src={logoUrl}
            unoptimized
            width={96}
          />
        ) : (
          <span aria-hidden="true">{initials || "VB"}</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          {pending ? "Salvando..." : "Alterar foto"}
        </span>
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white">
            Enviando...
          </span>
        )}
      </button>
      <p className="mt-2 text-xs text-vitta-muted">
        Toque na foto para enviar uma imagem
      </p>
      {error && (
        <p className="mt-2 text-center text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2 text-center text-xs text-emerald-700" role="status">
          {success}
        </p>
      )}
    </div>
  );
}
