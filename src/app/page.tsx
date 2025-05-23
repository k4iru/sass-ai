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
import { Header } from "@/components/Header/Header";

export default function Home() {
	return (
		<>
			<Header />
			<main className="">
				<p>Main content</p>
			</main>
		</>
	);
}
