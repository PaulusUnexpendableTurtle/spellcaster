function Parser (fs, Papa, table_names) {
	const arr = [];

	const parseTotal = table_names.length;
	var parseCount = 0;
	
	table_names.forEach(parse);
	
	function parse(table) {
		fs.readFile(`./res/${name}.csv`, 'utf-8', (err, data) => {
			if (err) {
				console.log(`error while reading file ${name} occured`);
				throw err;
			}
			console.log(`${name} succesfully read`);
			Papa.parse(data, {
				header: true,
				dynamicTyping: true,
				complete: (result) => {
					arr[name] = result.data;
					++parseCount;
					console.log(`${name} succesfully parsed`);
				}
			});
		});
	}

	this.complete = () => parseCount == parseTotal;
	this.get = () => arr;
}

module.exports = Parser;