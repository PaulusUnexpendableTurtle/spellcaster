function Parser (fs, Papa, table_names) {
	const arr = [];

	const parseTotal = table_names.length;
	var parseCount = 0;
	
	table_names.forEach(parse);
	
	function parse(table) {
		fs.readFile(`./res/${table}.csv`, 'utf-8', (err, data) => {
			if (err) {
				console.log(`error while reading file ${table} occured`);
				throw err;
			}
			console.log(`${table} succesfully read`);
			Papa.parse(data, {
				header: true,
				dynamicTyping: true,
				complete: (result) => {
					arr[table] = result.data;
					++parseCount;
					console.log(`${table} succesfully parsed`);
				}
			});
		});
	}

	this.complete = () => parseCount == parseTotal;
	this.get = () => arr;
}

module.exports = Parser;