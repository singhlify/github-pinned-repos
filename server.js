// const cors = require("cors")({ origin: true });
const express = require("express");
const cheerio = require("cheerio");
const axios = require("axios");
const { replaceWith } = require("cheerio/lib/api/manipulation");
// Project name, created year, description, link, image

const app = express();
const port = 3000;

const capitalize = (string) => {
	return string
		.split(" ")
		.map((str) => str.charAt(0).toUpperCase() + str.slice(1))
		.join(" ");
};

const stringToBoolean = (string) => {
	return string === "true" ? true : false;
};

const getProjectsImages = (projects) => {
	const requests = projects.map(async (project) => {
		const { data } = await axios.get(project.url);
		const $ = cheerio.load(data);
		const projectImage = $("meta[property='og:image']").attr("content");
		return {
			name: project.name,
			url: project.url,
			description: project.description,
			image: projectImage,
		};
	});

	return Promise.all(requests);
};

const getGithubApiData = async (username, projects) => {
	const githubApiUrl = `https://api.github.com/users/${username}/repos`;

	try {
		const { data } = await axios.get(githubApiUrl);
		let repos = [];

		data.forEach((repo) => {
			projects.forEach((project) => {
				const repoUrl = repo.html_url;
				const projectUrl = project.url;

				if (repoUrl.toLowerCase() === projectUrl.toLowerCase()) {
					repos.push({
						name: project.name,
						url: project.url,
						description: project.description,
						image: project.image,
						createdYear: repo.created_at.slice(0, 4),
					});
				}
			});
		});

		return repos;
	} catch (error) {
		console.log(error);
		return error;
	}
};

const getPinnedProjects = async (
	username = "blink98",
	needRepoImage,
	needGhApiData
) => {
	const url = `https://github.com/${username}`;

	try {
		const { data } = await axios.get(url);
		const $ = cheerio.load(data);
		const pinnedProjects = $(".pinned-item-list-item-content");

		let projects = [];

		pinnedProjects.each(async (index, element) => {
			const projectName = $(element)
				.find("a.mr-2.text-bold")
				.text()
				.replace(/\n/g, "");
			const projectUrl = `${url}/${projectName}`;

			projects.push({
				name: capitalize(projectName.replace(/-/g, " ")),
				url: projectUrl,
				description: $(element)
					.find("p.pinned-item-desc")
					.text()
					.replace(/\s\s+/g, ""),
			});
		});

		if (needRepoImage && needGhApiData) {
			projects = await getProjectsImages(projects);
			projects = await getGithubApiData(username, projects);
			return projects;
		} else if (needRepoImage) {
			projects = await getProjectsImages(projects);
			return projects;
		} else if (needGhApiData) {
			projects = await getGithubApiData(username, projects);
			return projects;
		}

		return projects;
	} catch (error) {
		console.error(error);
		return error;
	}
};

app.get("/", async (req, res) => {
	const result = await getPinnedProjects(
		req.query.username,
		stringToBoolean(req.query.needrepoimage),
		stringToBoolean(req.query.needghapidata)
	);
	res.send(result);
});

app.listen(port, () => console.log(`App listening on port ${port}`));