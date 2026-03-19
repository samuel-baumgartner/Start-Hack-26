import type { MarsWeather } from "@/types/greenhouse";

export const marsWeather: MarsWeather = {
  current: {
    temperature: "-23C",
    condition: "Dust haze - increasing",
    alert: "STORM ETA 4 SOLS",
    opticalDepthTau: "3.2",
    irradianceLoss: "62%",
    wind: "38 m/s gusts",
    pressure: "642 Pa",
  },
  forecast: [
    { sol: "Sol 248", temp: "-25C", icon: "sun-haze" },
    { sol: "Sol 249", temp: "-27C", icon: "dust" },
    { sol: "Sol 250", temp: "-28C", icon: "dust" },
    { sol: "Sol 251", temp: "-31C", icon: "storm" },
    { sol: "Sol 252", temp: "-29C", icon: "storm" },
  ],
};
