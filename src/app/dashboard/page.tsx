import Documents from "@/components/Documents/Documents";
import React from "react";
import styles from "./page.module.scss";

function Dashboard() {
	return (
		<div className={styles.container}>
			<h1 className={styles.title}>My Documents</h1>
			<Documents />
		</div>
	);
}

export default Dashboard;
