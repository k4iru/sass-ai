"use client";

import { Construction } from "lucide-react";
import styles from "./UnderConstruction.module.scss";

export const UnderConstruction = () => {
	return (
		<div className={styles.wrapper}>
			<Construction className={styles.icon} />
			<h1 className={styles.heading}>Under Construction</h1>
			<p className={styles.message}>
				This page is coming soon. Check back later!
			</p>
		</div>
	);
};
