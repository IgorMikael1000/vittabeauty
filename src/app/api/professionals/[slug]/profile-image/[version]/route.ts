import { getPrismaClient } from "@/lib/prisma";

type ProfileImageRouteProps = {
  params: Promise<{ slug: string; version: string }>;
};

export async function GET(
  _request: Request,
  { params }: ProfileImageRouteProps,
) {
  const { slug, version } = await params;
  if (!/^\d+$/.test(version)) {
    return new Response(null, { status: 404 });
  }

  const professional = await getPrismaClient().professional.findUnique({
    where: { slug },
    select: { logoUrl: true },
  });
  const imageMatch = professional?.logoUrl?.match(
    /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!imageMatch) {
    return new Response(null, { status: 404 });
  }

  const imageBytes = Buffer.from(imageMatch[1], "base64");
  if (
    imageBytes.length < 12 ||
    imageBytes.toString("base64") !== imageMatch[1] ||
    imageBytes.toString("ascii", 0, 4) !== "RIFF" ||
    imageBytes.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return new Response(null, { status: 404 });
  }

  return new Response(imageBytes, {
    headers: {
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "Content-Length": String(imageBytes.length),
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
