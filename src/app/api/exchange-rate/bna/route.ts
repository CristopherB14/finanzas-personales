import { NextResponse } from "next/server";
import { fetchBnaUsdVentaRate } from "@/lib/finance/bna-rate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const rate = await fetchBnaUsdVentaRate();
    return NextResponse.json(rate, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo obtener la cotización BNA.",
      },
      { status: 502 }
    );
  }
}
