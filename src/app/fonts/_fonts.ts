import localFont from "next/font/local";

export const roboto = localFont({
	src: [
		{
			path: "./roboto/RobotoMono-Regular.woff2",
			style: "normal",
		},
		{
			path: "./roboto/RobotoMono-Italic.woff2",
			style: "italic",
		},
	],
	variable: "--font-roboto",
	display: "swap",
});

export const firaSans = localFont({
	src: [
		{ path: "fira/FiraSans-LightItalic.woff2", weight: "300", style: "italic" },
		{ path: "fira/FiraSans-ExtraLight.woff2", weight: "200", style: "normal" },
		{ path: "fira/FiraSans-ExtraBold.woff2", weight: "bold", style: "normal" },
		{
			path: "fira/FiraSans-ExtraBoldItalic.woff2",
			weight: "bold",
			style: "italic",
		},
		{ path: "fira/FiraSans-Italic.woff2", weight: "normal", style: "italic" },
		{ path: "fira/FiraSans-BoldItalic.woff2", weight: "bold", style: "italic" },
		{ path: "fira/FiraSans-Black.woff2", weight: "900", style: "normal" },
		{ path: "fira/FiraSans-BlackItalic.woff2", weight: "900", style: "italic" },
		{ path: "fira/FiraSans-Light.woff2", weight: "300", style: "normal" },
		{
			path: "fira/FiraSans-ExtraLightItalic.woff2",
			weight: "200",
			style: "italic",
		},
		{ path: "fira/FiraSans-Bold.woff2", weight: "bold", style: "normal" },
		{ path: "fira/FiraSans-Regular.woff2", weight: "normal", style: "normal" },
		{ path: "fira/FiraSans-Thin.woff2", weight: "100", style: "normal" },
		{ path: "fira/FiraSans-SemiBold.woff2", weight: "600", style: "normal" },
		{
			path: "fira/FiraSans-SemiBoldItalic.woff2",
			weight: "600",
			style: "italic",
		},
		{ path: "fira/FiraSans-ThinItalic.woff2", weight: "100", style: "italic" },
		{
			path: "fira/FiraSans-MediumItalic.woff2",
			weight: "500",
			style: "italic",
		},
		{ path: "fira/FiraSans-Medium.woff2", weight: "500", style: "normal" },
	],
	display: "swap",
	variable: "--font-fira-sans",
});
