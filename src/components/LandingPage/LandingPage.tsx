import clsx from "clsx";
import { ArrowLeftRight, DollarSign, Target } from "lucide-react";
import Link from "next/link";
import { Benefit } from "@/components/ui/Benefit/Benefit";
import { Button } from "@/components/ui/Button/Button";
import styles from "./LandingPage.module.scss";

export const LandingPage = () => {
	return (
		<div className={styles.container}>
			<div className={styles.title}>
				<h1>The latest models.</h1>
				<h1>One interface.</h1>
			</div>
			<div className={styles.descriptionContainer}>
				<p className={clsx(styles.description, "body-xl")}>
					Talk to GPT-4, Claude, Gemini and many more. All from one ultra light
					interface.
				</p>
				<p className={clsx(styles.description, "body-xl")}>
					Use your own API keys for the lowest costs for premium models. Whether
					you&apos;re testing models or crafting prompts, Keppel makes it
					effortless.
				</p>
			</div>
			<Link href="/chat">
				<Button size="large" variant="primary" className={styles.cta}>
					Try for free
				</Button>
			</Link>

			<div className={styles.benefitsContainer}>
				<Benefit
					icon={ArrowLeftRight}
					header="Multi-Model Support"
					description="Bring your own API keys from OpenAI, Anthropic, Google, and many more. Use the latest models with no vendor lock in."
				/>
				<Benefit
					icon={Target}
					header="Built for Power Users"
					description="Minimal UI, Rich text formatting, advanced features and settings for customizing every chat"
				/>
				<Benefit
					icon={DollarSign}
					header="Transparent Pricing"
					description="Top up and pay only for what you use. No hidden fees or upselling. Real time usage alerts and detailed billing logs."
					customStyle={{ position: "relative", left: "-5px" }}
				/>
			</div>
		</div>
	);
};
