import { CloudSun, Cloudy, Tornado, TriangleAlert, Wind } from "lucide-react";
import type { MarsWeather as MarsWeatherType } from "@/types/greenhouse";

interface MarsWeatherProps {
  data: MarsWeatherType;
}

function iconFor(type: "dust" | "sun-haze" | "storm") {
  if (type === "storm") return <Tornado className="h-5 w-5 text-[#8b1f1f]" />;
  if (type === "dust") return <Cloudy className="h-5 w-5 text-[#9b6d27]" />;
  return <CloudSun className="h-5 w-5 text-[#468165]" />;
}

export function MarsWeather({ data }: MarsWeatherProps) {
  return (
    <section className="h-full rounded-2xl border border-[#d9e8db] bg-white/80 p-5">
      <h3 className="mb-4 text-2xl font-semibold text-[#1d352a]">Mars Weather Forecast</h3>

      <div className="mb-4 rounded-2xl border border-[#f3ce97] bg-[#fff7ec] p-4">
        <p className="text-base text-[#4a6656]">{data.current.condition}</p>
        <p className="my-1.5 text-3xl font-semibold text-[#243f32]">{data.current.temperature}</p>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1.5 text-sm font-semibold text-[#92400e]">
          <TriangleAlert className="h-4 w-4" />
          {data.current.alert}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 text-sm text-[#4f6d5c]">
        <p className="rounded-xl bg-[#f3f8f4] p-3">Optical depth tau: {data.current.opticalDepthTau}</p>
        <p className="rounded-xl bg-[#f3f8f4] p-3">Irradiance loss: {data.current.irradianceLoss}</p>
        <p className="inline-flex items-center gap-1.5 rounded-xl bg-[#f3f8f4] p-3">
          <Wind className="h-4 w-4 text-[#7f5e31]" />
          {data.current.wind}
        </p>
        <p className="rounded-xl bg-[#f3f8f4] p-3">Pressure: {data.current.pressure}</p>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#63816f]">5-Sol Outlook</p>
        <div className="grid grid-cols-5 gap-2">
          {data.forecast.map((day) => (
            <div key={day.sol} className="rounded-xl border border-[#deebdf] bg-white p-2.5 text-center text-sm">
              <p className="mb-1 font-mono text-[#486554]">{day.sol.replace("Sol ", "")}</p>
              <div className="mb-1.5 flex justify-center">{iconFor(day.icon)}</div>
              <p className="font-semibold text-[#2f4b3c]">{day.temp}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
