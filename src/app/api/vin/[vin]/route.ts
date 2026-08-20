import { NextResponse } from 'next/server';
import { decodeVin, isValidVin } from '@/lib/vin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vin: string }> },
) {
  const { vin } = await params;

  if (!isValidVin(vin)) {
    return NextResponse.json(
      { error: 'Un VIN válido tiene 17 caracteres y no lleva las letras I, O ni Q.' },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ ok: true, data: await decodeVin(vin) });
  } catch (error) {
    return NextResponse.json(
      {
        error: `No se pudo consultar el VIN: ${error instanceof Error ? error.message : 'error desconocido'}. Puedes llenar los datos a mano.`,
      },
      { status: 502 },
    );
  }
}
