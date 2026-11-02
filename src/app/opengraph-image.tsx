import { ImageResponse } from "next/og";

export const alt =
  "Vitta Beauty: agenda online para profissionais da beleza";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "76px",
          background:
            "linear-gradient(135deg, #f8f3fb 0%, #fff8f8 55%, #efe4f4 100%)",
          color: "#392b43",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            color: "#7950a5",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#d98cae",
            }}
          />
          VITTA BEAUTY
        </div>
        <div
          style={{
            maxWidth: 950,
            marginTop: 38,
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: "-0.04em",
          }}
        >
          Agenda online para profissionais da beleza
        </div>
        <div
          style={{
            marginTop: 24,
            color: "#74677e",
            fontSize: 30,
            lineHeight: 1.35,
          }}
        >
          Organize sua rotina e deixe suas clientes agendarem online.
        </div>
      </div>
    ),
    size,
  );
}
