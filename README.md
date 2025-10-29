# Text-Generation Monorepo

[![Build Status](https://img.shields.io/shields/endpoint?url=https://gist.githubusercontent.com/MichaelPaulukonis/e72b58a7b555a298315335a86583c656/raw/textgen-monorepo-build-status.json)](https://github.com/MichaelPaulukonis/textgen-monorepo/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Nx Version](https://img.shields.io/badge/nx-22.0.2-blue.svg)](https://nx.dev)

A monorepo for experimental text generation projects, combining multiple efforts into a shared ecosystem. This project is for experimental poets who like coding, and experimental coders who like poeting.

## Overview

This monorepo houses a collection of applications and libraries focused on algorithmic and generative text art. The primary goal is to consolidate development, share resources, and streamline the creation and deployment of some of my text-based art projects. The current residents are `poeticalbot` and `listmania`, two bots that post their generative creations to Tumblr.

- **Project Status**: In perpetual development, but stable.
- **Main Technology**: Node.js, Nx, pnpm
- **Target Audience**: Experimental poets, creative coders, and generative art enthusiasts.

## Table of Contents

- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [PoeticalBot](#poeticalbot)
  - [Listmania](#listmania)
- [Development](#development)
  - [Running Tests](#running-tests)
  - [Linting](#linting)
  - [Building](#building)
  - [Deployment](#deployment)
- [Features](#features)
- [Contributing](#contributing)
- [License](#license)

## Project Structure

This monorepo is managed by [Nx](https://nx.dev). Here is an overview of the key directories:

```
/
├── apps/
│   ├── poeticalbot/      # Algorithmic poetry generator (AWS Lambda)
│   └── listmania/        # Generative list maker (Heroku)
├── libs/
│   └── common-corpus/    # Shared library of text corpora
├── tools/                # Shared tooling and scripts
├── nx.json               # Nx workspace configuration
└── package.json          # Root package.json
```

- **`apps/`**: Contains the individual applications.
  - `poeticalbot`: A sophisticated poetry generation bot with multiple algorithms.
  - `listmania`: A bot that generates and posts lists.
- **`libs/`**: Contains shared libraries used by the applications.
  - `common-corpus`: A library of text corpora for generation.
- **`tools/`**: Shared scripts and tooling for the monorepo.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (>=22.0.0)
- [pnpm](https://pnpm.io/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/MichaelPaulukonis/textgen-monorepo.git
    cd textgen-monorepo
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**
    Each app uses a `.env` file for configuration, primarily for Tumblr API keys. Copy the `.env.example` in each app's directory to `.env` and fill in your credentials.

    - `apps/poeticalbot/.env.example`
    - `apps/listmania/.env.example`

    For instructions on how to get Tumblr API keys, see the [Tumblr API Configuration Guide](apps/poeticalbot/docs/tumblr-config.md).

## Usage

You can run each application individually from the root of the monorepo.

### PoeticalBot

`poeticalbot` can be run via the command line to generate a poem.

```bash
# Run poeticalbot with a specific method
nx cli:sample poeticalbot

# See all available options
nx cli:help poeticalbot
```

### Listmania

`listmania` can also be run from the command line.

```bash
# Run listmania
nx start listmania

# Run with a specific method
nx start listmania -- -m weird
```

## Development

This monorepo uses `nx` to manage development tasks like testing, linting, and building.

### Running Tests

```bash
# Run tests for all projects
nx run-many --target=test --all

# Run tests for a specific project
nx test poeticalbot
```

### Linting

```bash
# Lint all projects
nx run-many --target=lint --all

# Lint a specific project
nx lint poeticalbot
```

### Building

```bash
# Build all projects
nx run-many --target=build --all

# Build a specific project
nx build poeticalbot
```

### Deployment

Deployment scripts are available for each app.

```bash
# Deploy poeticalbot
nx deploy poeticalbot

# Deploy listmania
nx deploy listmania
```

## Features

- **Multiple Generation Algorithms**: `poeticalbot` includes several methods for generating poetry, including template-based generation (JGnoetry), combinatorial text rearrangement (Queneau Buckets), and repetitive sentence structures (Sentence Drone).
- **Text Transformations**: Apply stylistic modifications to generated poems, such as misspelling, sorting, and spacing adjustments.
- **Shared Corpus**: A common library of text corpora provides the source material for generation.
- **Monorepo Management**: `nx` and `pnpm` provide a robust framework for managing the monorepo.
- **CI/CD**: The project is set up for CI/CD with GitHub Actions.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

### Contribution Guidelines

1.  **Fork the repository.**
2.  **Create a new branch:** `git checkout -b my-feature-branch`
3.  **Make your changes.**
4.  **Run tests and linting:** `pnpm test` and `pnpm lint`
5.  **Commit your changes:** `git commit -m "feat: add new feature"`
6.  **Push to your branch:** `git push origin my-feature-branch`
7.  **Open a pull request.**

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
