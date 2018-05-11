function Parser (fs, Papa, table_names) {
	const arr = [];

	const parseTotal = table_names.length;
	var parseCount = 0;
	
	table_names.forEach(parse);
	
	function parse(table) {
		fs.readFile(`./res/${table.name}.csv`, 'utf-8', (err, data) => {
			if (err) {
				console.log(`error while reading file ${table.name} occured`);
				throw err;
			}
			console.log(`${table.name} succesfully read`);
			Papa.parse(data, {
				header: table.header,
				dynamicTyping: true,
				complete: (result) => {
					arr[table] = result.data;
					++parseCount;
					console.log(`${table.name} succesfully parsed`);
				}
			});
		});
	}

	this.complete = () => parseCount == parseTotal;
	this.get = (name) => name === undefined ? arr : arr[name];
}

module.exports = Parser;
