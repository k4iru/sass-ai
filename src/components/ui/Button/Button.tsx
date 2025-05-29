import styles from "./Button.module.scss";
import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline";
type Size = "small" | "medium" | "large";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
}

export const Button: React.FC<ButtonProps> = ({
	children,
	className,
	variant = "primary",
	size = "medium",
	disabled = false,
	type = "button",
	...props
}: ButtonProps) => {
	return (
		<button
			type={type}
			className={clsx(
				styles.button,
				styles[variant],
				styles[size],
				disabled && styles.disabled,
				className,
			)}
			disabled={disabled}
			{...props}
		>
			{children}
		</button>
	);
};
