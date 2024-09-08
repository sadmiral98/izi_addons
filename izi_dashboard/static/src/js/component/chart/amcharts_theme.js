class amChartsTheme {
    static palette = {
        // 'Animated' : [],
        'Colorful': [
            am4core.color("#278ECF"),
            am4core.color("#4BD762"),
            am4core.color("#FFCA1F"),
            am4core.color("#FF9416"),
            am4core.color("#D42AE8"),
            am4core.color("#535AD7"),
            am4core.color("#FF402C"),
            am4core.color("#83BFFF"),
            am4core.color("#6EDB8F"),
            am4core.color("#FFE366"),
        ],
        'Contrast': [
            am4core.color("#0077ff"),
            am4core.color("#9208b8"),
            am4core.color("#ae00c7"),
            am4core.color("#cb00a3"),
            am4core.color("#ec01bd"),
            am4core.color("#ff39a1"),
            am4core.color("#ffdada"),
            am4core.color("#ffaaaa"),
            am4core.color("#ff8080"),
            am4core.color("#ff5757"),
            am4core.color("#d40000"),
            am4core.color("#d40000"),
        ],
        'Joyful': [
            am4core.color("#EE4900"),
            am4core.color("#FFC436"),
            am4core.color("#48B0DF"),
            am4core.color("#734A87"),
            am4core.color("#115E7C"),
            am4core.color("#6693AC"),
            am4core.color("#DCD09A"),
        ],
        'Mint': [
            am4core.color("#01B8AA"),
            am4core.color("#FD625E"),
            am4core.color("#F2C80F"),
            am4core.color("#34495e"),
            am4core.color("#8AD4EB"),
            am4core.color("#FE9666"),
            am4core.color("#A66999"),
        ],
        'Prime': [
            am4core.color("#FF8900"),
            am4core.color("#197BBD"),
            am4core.color("#05B384"),
            am4core.color("#904C77"),
            am4core.color("#323758"),
            am4core.color("#89AC04"),
            am4core.color("#EACA35"),
        ],
        'Simple': [],
        'Borneo': [
            am4core.color("#1BA68D"),
            am4core.color("#E7DA4F"),
            am4core.color("#E77624"),
            am4core.color("#DF3520"),
            am4core.color("#E21DAC"),
            am4core.color("#8E44AD"),
            am4core.color("#64297B"),
            am4core.color("#3CB6C4"),
        ],
        'Day': [
            am4core.color("#4C7EBA"),
            am4core.color("#FCDA64"),
            am4core.color("#65CEEF"),
            am4core.color("#3DC4C1"),
            am4core.color("#B983FF"),
            am4core.color("#e67e22"),
        ],
        'Dusk': [
            am4core.color("#845EC2"),
            am4core.color("#D65DB1"),
            am4core.color("#FF6F91"),
            am4core.color("#FF9671"),
            am4core.color("#FFC75F"),
            am4core.color("#F9F871"),
        ],
        'Happiness': [
            am4core.color("#ea5545"),
            am4core.color("#E9169A"),
            am4core.color("#ef9b20"),
            am4core.color("#edbf33"),
            am4core.color("#ede15b"),
            am4core.color("#bdcf32"),
            am4core.color("#87bc45"),
            am4core.color("#27aeef"),
            am4core.color("#b33dc6"),
        ],
        'Night': [
            am4core.color("#293462"),
            am4core.color("#F24C4C"),
            am4core.color("#EC9B3B"),
            am4core.color("#F7D716"),
            am4core.color("#C05C7E"),
            am4core.color("#72147E"),
            am4core.color("#C10FB4"),
        ],
        'Metro': [
            am4core.color("#15616D"),
            am4core.color("#E06C00"),
            am4core.color("#FFDDAD"),
            am4core.color("#77AF9C"),
            am4core.color("#2c3e50"),
            am4core.color("#78290F"),
            am4core.color("#ACD2ED"),
            am4core.color("#C94057"),
        ]
    };

    static applyTheme(code) {
        var self = this;
        am4core.unuseAllThemes();
        if (code == 'Simple') {
            return true;
        } else if (code == 'Animated') {
            return am4core.useTheme(am4themes_animated);
        } else {
            function customTheme(target) {
                if (target instanceof am4core.ColorSet) {
                    target.list = self.palette[code];
                }
            }
            return am4core.useTheme(customTheme);
        };
    }
}