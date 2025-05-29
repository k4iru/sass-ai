import styles from "./Benefit.module.scss";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

type BenefitProps = {
	icon: LucideIcon;
	header: string;
	customStyle?: React.CSSProperties;
	description: string;
	className?: string;
};

export const Benefit = ({
	icon: Icon,
	header,
	description,
	customStyle,
	className,
	...props
}: BenefitProps) => {
	return (
		<div className={clsx(styles.container)} {...props}>
			<Icon
				className={clsx(styles.icon, className)}
				stroke="currentColor"
				style={customStyle}
			/>
			<h2 className={styles.header}>{header}</h2>
			<p className={styles.description}>{description}</p>
		</div>
	);
};
