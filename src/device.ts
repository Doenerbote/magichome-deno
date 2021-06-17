import { ColorMode } from "./colorMode.ts";

export class Device {
	private host: string;
	private mode: ColorMode;

	private socket: Deno.Conn | undefined;
	public closeAfterSend = false;

	public constructor(host: string, mode = ColorMode.RGB) {
		this.host = host;
		this.mode = mode;
	}

	private async connect(): Promise<void> {
		if (this.socket) return;
		console.debug(`[MagicHome-Deno] Connecting to ${this.host} ..`);
		this.socket = await Deno.connect({ hostname: this.host, port: 5577 });
	}

	private async disconnect(): Promise<void> {
		await this.socket?.close();
		this.socket = undefined;
	}

	private async send(payload: Array<number>): Promise<number | undefined> {
		await this.connect();

		const checksum = payload.reduce((sum, b) => sum + b, 0);
		payload.push(checksum & 0xFF);

		let res;
		try {
			res = await this.socket?.write(Uint8Array.from(payload));
		}
		catch (e) {
			if (e instanceof Deno.errors.ConnectionReset) {
				console.debug(`[MagicHome-Deno] ConnectionReset: Lost connection to ${this.host} ..`);
				this.disconnect();
				this.connect();
				this.send(payload);
			}
			else throw e;
		}


		if (this.closeAfterSend) await this.disconnect();
		return res;
	}



	public async setColorHSV(h: number, s: number, v: number): Promise<number | undefined> {

		h /= 360;
		s /= 100;
		v /= 100;

		if (!s) {
			v *= 255;
			return await this.setColorRGBW(v, v, v);
		}

		const c = Math.floor(h * 6);
		const d = (h * 6) - c;

		const o = Math.floor(255 * (v * (1 - s)));
		const p = Math.floor(255 * (v * (1 - s * d)));
		const q = Math.floor(255 * (v * (1 - s * (1 - d))));
		v *= 255;

		const [r, g, b] = [
			[v, q, o],
			[p, v, o],
			[o, v, q],
			[o, p, v],
			[q, o, v],
			[v, o, p],
		][c % 6];

		return await this.setColorRGBW(r, g, b);
	}

	public async setColorRGBW(r: number, g: number, b: number, w = 0): Promise<number | undefined> {
		switch (this.mode) {
			case ColorMode.RGB: return await this.send([0x31, r, g, b, w, 0, 0x0F]);
			case ColorMode.GRB: return await this.send([0x31, g, r, b, w, 0, 0x0F]);
			case ColorMode.BRG: return await this.send([0x31, b, r, g, w, 0, 0x0F]);
		}
	}

	public async setPower(on: boolean): Promise<number | undefined> {
		return await this.send([0x71, on ? 0x23 : 0x24, 0x0F]);
	}
}