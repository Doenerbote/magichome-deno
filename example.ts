import { Device } from './mod.ts';
import { ColorMode } from './src/colorMode.ts';

const dev = new Device("192.168.2.61", ColorMode.RGB);

await dev.setPower(true);
await dev.setColorRGBW(255, 255, 255, 255);

let h = 0;
setInterval(() => {
    dev.setColorHSV(h, 100, 100);

    if(++h >= 360) h = 0;
}, 100);