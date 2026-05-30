import React from 'react';
import { Clock } from 'lucide-react';

interface TimePicker24hProps {
  value: string; // "HH:MM"
  onChange: (newValue: string) => void;
  disabled?: boolean;
  onResetToNow?: () => void;
  label?: string;
  id?: string;
}

export const TimePicker24h: React.FC<TimePicker24hProps> = ({
  value,
  onChange,
  disabled = false,
  onResetToNow,
  label,
  id
}) => {
  // Extract hours and minutes
  const isTimeSet = !!value;
  const [valHour, valMinute] = isTimeSet ? value.split(':') : ['', ''];
  const safeHour = valHour ? valHour.padStart(2, '0') : '';
  const safeMinute = valMinute ? valMinute.padStart(2, '0') : '';

  const hoursArray = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutesArray = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleHourChange = (newHour: string) => {
    if (!newHour) {
      onChange('');
      return;
    }
    const m = safeMinute || '00';
    onChange(`${newHour}:${m}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    if (!newMinute) {
      onChange('');
      return;
    }
    const h = safeHour || new Date().getHours().toString().padStart(2, '0');
    onChange(`${h}:${newMinute}`);
  };

  const adjustMinutes = (mins: number) => {
    const baseHour = safeHour || new Date().getHours().toString().padStart(2, '0');
    const baseMinute = safeMinute || new Date().getMinutes().toString().padStart(2, '0');
    const currentMins = parseInt(baseHour, 10) * 60 + parseInt(baseMinute, 10);
    let totalMins = currentMins + mins;
    if (totalMins < 0) {
      totalMins = (24 * 60) + (totalMins % (24 * 60));
    }
    totalMins = totalMins % (24 * 60);
    const newH = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const newM = (totalMins % 60).toString().padStart(2, '0');
    onChange(`${newH}:${newM}`);
  };

  return (
    <div 
      className={`flex flex-col space-y-1 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      id={id}
    >
      {label && (
        <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-0.5">{label}</span>
      )}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 w-full">
          {/* Hour Select */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              disabled={disabled}
              value={safeHour}
              onChange={(e) => handleHourChange(e.target.value)}
              className="appearance-none bg-slate-950 text-slate-100 rounded-md pl-2.5 pr-6 py-2 text-sm sm:text-xs font-mono font-bold focus:outline-none text-center cursor-pointer w-full sm:min-w-[56px] border border-slate-800"
              style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              title="Chọn giờ"
            >
              <option value="" className="bg-slate-950 text-slate-500 font-mono">--</option>
              {hoursArray.map((h) => (
                <option key={h} value={h} className="bg-slate-950 text-slate-100 font-mono">
                  {h}
                </option>
              ))}
            </select>
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[8px]">▼</span>
          </div>

          <span className="text-slate-600 font-mono font-extrabold text-xs hidden sm:inline">:</span>

          {/* Minute Select */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              disabled={disabled}
              value={safeMinute}
              onChange={(e) => handleMinuteChange(e.target.value)}
              className="appearance-none bg-slate-950 text-slate-100 rounded-md pl-2.5 pr-6 py-2 text-sm sm:text-xs font-mono font-bold focus:outline-none text-center cursor-pointer w-full sm:min-w-[56px] border border-slate-800"
              style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              title="Chọn phút"
            >
              <option value="" className="bg-slate-950 text-slate-500 font-mono">--</option>
              {minutesArray.map((m) => (
                <option key={m} value={m} className="bg-slate-950 text-slate-100 font-mono">
                  {m}
                </option>
              ))}
            </select>
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[8px]">▼</span>
          </div>
        </div>

        {/* Quick adjustment badges */}
        <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:space-x-1 sm:flex-wrap">
          <button
            type="button"
            disabled={disabled}
            onClick={() => adjustMinutes(-15)}
            className="px-2 py-2 sm:px-1.5 sm:py-1 bg-rose-955/30 hover:bg-rose-950/60 border border-rose-900/30 hover:border-rose-500/20 text-rose-400 rounded text-[11px] sm:text-[9.5px] font-bold font-mono transition cursor-pointer leading-none"
            title="Lùi 15 phút"
          >
            -15p
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => adjustMinutes(-5)}
            className="px-2 py-2 sm:px-1.5 sm:py-1 bg-rose-955/20 hover:bg-rose-950/40 border border-rose-900/20 hover:border-rose-500/10 text-rose-400 rounded text-[11px] sm:text-[10px] font-medium font-mono transition cursor-pointer leading-none"
            title="Lùi 5 phút"
          >
            -5p
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => adjustMinutes(5)}
            className="px-2 py-2 sm:px-1.5 sm:py-1 bg-emerald-955/20 hover:bg-emerald-950/40 border border-emerald-900/20 hover:border-emerald-500/10 text-emerald-400 rounded text-[11px] sm:text-[10px] font-medium font-mono transition cursor-pointer leading-none"
            title="Tới 5 phút"
          >
            +5p
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => adjustMinutes(15)}
            className="px-2 py-2 sm:px-1.5 sm:py-1 bg-emerald-955/30 hover:bg-emerald-950/60 border border-emerald-900/30 hover:border-emerald-500/20 text-emerald-400 rounded text-[11px] sm:text-[9.5px] font-bold font-mono transition cursor-pointer leading-none"
            title="Tới 15 phút"
          >
            +15p
          </button>
          {onResetToNow && (
            <button
              type="button"
              disabled={disabled}
              onClick={onResetToNow}
              className="px-2 py-2 sm:px-2 sm:py-1 bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-900/30 hover:border-indigo-500/20 text-indigo-400 rounded-lg text-[11px] sm:text-[9.5px] font-bold transition cursor-pointer flex items-center space-x-1 leading-none justify-center"
              title="Đặt lại giờ hiện tại"
            >
              <Clock size={10} />
              <span>Bây giờ</span>
            </button>
          )}
          {value && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('')}
              className="px-2 py-2 sm:px-1.5 sm:py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded text-[11px] sm:text-[9.5px] font-bold transition cursor-pointer leading-none"
              title="Xóa giờ để rỗng (Đang hát)"
            >
              Để rỗng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
