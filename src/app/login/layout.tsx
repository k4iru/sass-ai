import styles from "./layout.module.scss";

const LoginLayout = ({ children }: { children: React.ReactNode }) => {
	return <div className={styles.layout}>{children}</div>;
};

export default LoginLayout;
