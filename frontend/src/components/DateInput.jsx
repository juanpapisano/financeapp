import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarDays } from "lucide-react";

const CustomInput = forwardRef(({ value, onClick, placeholder, inputClassName }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className={`flex w-full items-center justify-between rounded-full border border-border px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40 transition ${inputClassName}`}
  >
    <span className={value ? "text-text-primary" : "text-text-muted"}>{value || placeholder}</span>
    <CalendarDays size={18} className="text-text-muted" />
  </button>
));

CustomInput.displayName = "DateInputButton";

const DateInput = forwardRef(
  (
    {
      value,
      onChange,
      placeholder = "DD/MM/AAAA",
      className = "",
      inputClassName = "bg-base-muted/80",
      name,
      yearDropdownItemNumber = 20,
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef(null);

    useImperativeHandle(ref, () => internalRef.current);

    const selectedDate = useMemo(() => {
      if (!value) return null;
      const [year, month, day] = value.split("-").map(Number);
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day);
    }, [value]);

    const handleChange = (date) => {
      const formatted = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
            date.getDate(),
          ).padStart(2, "0")}`
        : "";
      if (onChange) {
        onChange({ target: { value: formatted, name } });
      }
    };

    return (
      <div className={className}>
        <DatePicker
          ref={internalRef}
          selected={selectedDate}
          onChange={handleChange}
          dateFormat="dd/MM/yyyy"
          customInput={<CustomInput placeholder={placeholder} inputClassName={inputClassName} />}
          calendarClassName="date-picker-calendar"
          popperClassName="date-picker-popper"
          wrapperClassName="w-full"
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          scrollableYearDropdown
          yearDropdownItemNumber={yearDropdownItemNumber}
          {...props}
        />
      </div>
    );
  },
);

DateInput.displayName = "DateInput";

export default DateInput;
