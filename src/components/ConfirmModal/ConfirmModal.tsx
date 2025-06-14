"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import styles from "./ConfirmModal.module.scss";

type ConfirmModalProps = {
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
};

export const ConfirmModal = ({
	message,
	onConfirm,
	onCancel,
}: ConfirmModalProps) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	if (!mounted) return null;

	return createPortal(
		<div className={styles.overlay}>
			<div className={styles.modal}>
				<p>{message}</p>
				<div className={styles.actions}>
					<button className={styles.cancel} type="button" onClick={onCancel}>
						Cancel
					</button>
					<button className={styles.confirm} type="button" onClick={onConfirm}>
						Delete
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
};
