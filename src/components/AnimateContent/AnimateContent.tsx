import styles from "./AnimateContent.module.scss";

export const AnimateContent = ({ content }: { content: string }) => {
	return (
		<div className={styles.animateWrapper}>
			<h1>This content should be animated</h1>
			{content}
		</div>
	);
};
