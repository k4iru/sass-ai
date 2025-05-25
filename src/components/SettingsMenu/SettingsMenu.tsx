import { Settings } from "lucide-react";
import styles from "./SettingsMenu.module.scss";

export const SettingsMenu = () => {
	return (
		<button type="button" className={styles.settingsButton}>
			<Settings className={styles.settingsIcon} />
		</button>
	);
};
