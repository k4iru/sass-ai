import { HomeHeader } from "@/components/Header/HomeHeader";
import { LandingPage } from "@/components/LandingPage/LandingPage";

const Home = () => {
	return (
		<>
			<HomeHeader />
			<main className="">
				<LandingPage />
			</main>
		</>
	);
};
export default Home;
