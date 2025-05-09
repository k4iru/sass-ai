import React from "react";
import PlaceholderDocument from "../PlaceholderDocument";
import styles from "./Documents.module.scss";

function Documents() {
	return (
		<div className={styles.container}>
			{/* map through documents */}
			{/* placeholder docs*/}
			<PlaceholderDocument />
		</div>
	);
}

export default Documents;
