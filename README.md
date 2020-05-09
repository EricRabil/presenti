# Presenti

Presenti is a flexible data aggregation service for statuses across platforms. It is designed to be plug-n-play with a Module API allowing you to integrate any platform to fit your needs. It can be used to make a status page for your personal website, or to aggregate the status of your services into one endpoint.

> **Heads up!**
>
> Presenti is in very early development, and this is mostly a one-man show. You may find a lack of documentation in certain areas, as I am still working through the project and writing documentation for it. This project is still coming out of the prototyping phase, which is why there is not much documentation at this time. If you have any questions, feel free to open an issue and I will get back to you as soon as I can.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

- [PostgreSQL](https://www.postgresql.org/)
- [Node](https://nodejs.org/en/download/) >= 12
- [Yarn](https://yarnpkg.com/) - *We use yarn to maintain properly linked packages, making it easier to develop without running `npm link` whenever a package is installed*
- [TypeScript](https://www.typescriptlang.org/) >= 3.8.3 (*for development only*)
- Linux, Windows, or macOS

```bash
# Mac
brew install postgresql
brew services start postgresql
```

### Installing

To prepare for a development environment, run the following commands

```bash
# Install packages
yarn install
# Compile packages
yarn run build
```

To watch the packages, run

```bash
# Watch packages
yarn run watch
```

#### Renderer Development

Because the renderer is much heavier to compile (given it is a webpack project undergoing transpilation, minification, and concatenation into just a few files), build commands for that project are isolated into their own scripts.

To build the renderer, run the following command:

```bash
# Build renderer
yarn run build:renderer
```

To watch the renderer, run:

```bash
# Watch renderer
yarn run watch:renderer
```

To see server-specific documentation, head on over to [@presenti/server](https://github.com/EricRabil/presenti/tree/master/packages/server)