import { Button } from "@/components/ui/button";
import {
	BrainCogIcon,
	EyeIcon,
	GlobeIcon,
	MonitorSmartphoneIcon,
	ServerCogIcon,
	ZapIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LandingPage } from "@/components/LandingPage/LandingPage";

const Home = () => {
	return (
		<>
			<main className="">
				<LandingPage />
			</main>
		</>
	);
};
export default Home;
