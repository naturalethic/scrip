# Scrip

Scrip is a small utility to easily manage some scripts in your node project.

## Installation

`yarn add scrip`

## Usage

1. `scrip create foo:bar`
1. Edit `scripts/foo/bar.js` to export a function:

	```
	module.exports = (options) => {
	  console.log(options)
	}
	```
1. `yarn foo:bar bim bam --boo-baz --zip zap yip`

	```
	[ 'bim', 'bam', 'yip', booBaz: true, zip: 'zap' ]
	```
	
Script entries in `package.json` are added when scripts are created.  If you manually move files around in `scripts/`, you can sync up with `package.json` using `scrip sync`.

## Notes
Any files in `scripts/lib` will be ignored when syncing to `package.json`.