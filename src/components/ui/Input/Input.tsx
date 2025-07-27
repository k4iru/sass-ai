import styles from "./Input.module.scss";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	className?: string;
	// You can add other custom props here if needed
}

export const Input: React.FC<InputProps> = ({
	className,
	type,
	value,
	...props
}: InputProps) => {
	return (
		<input
			type={type}
			className={clsx(styles.input, className)}
			placeholder="search..."
			{...props}
			value={value}
		/>
	);
};
